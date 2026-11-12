import json
from datetime import date
from functools import wraps

from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.http import Http404, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import Attendance, AttendanceRequest, Employee, LeaveRequest, Task


class ApiInputError(Exception):
    pass


def api_methods(*methods):
    def decorate(view):
        @csrf_exempt
        @require_http_methods(methods)
        @wraps(view)
        def wrapped(request, *args, **kwargs):
            try:
                return view(request, *args, **kwargs)
            except ApiInputError as error:
                return JsonResponse({"error": str(error)}, status=400)
            except Http404:
                return JsonResponse({"error": "The requested record was not found."}, status=404)
            except IntegrityError:
                return JsonResponse(
                    {"error": "The operation conflicts with an existing record."},
                    status=409,
                )

        return wrapped

    return decorate


def read_payload(request):
    try:
        payload = json.loads(request.body)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ApiInputError("Request body must be valid JSON.") from error
    if not isinstance(payload, dict):
        raise ApiInputError("Request body must be a JSON object.")
    return payload


def text_value(payload, key, *, max_length, optional=False):
    value = payload.get(key, "")
    if not isinstance(value, str):
        raise ApiInputError(f"{key} must be text.")
    value = value.strip()
    if not value and not optional:
        raise ApiInputError(f"{key} is required.")
    if len(value) > max_length:
        raise ApiInputError(f"{key} must be no longer than {max_length} characters.")
    return value


def choice_value(payload, key, choices):
    value = text_value(payload, key, max_length=30)
    allowed = [choice for choice, _label in choices]
    if value not in allowed:
        raise ApiInputError(f"{key} must be one of: {', '.join(allowed)}.")
    return value


def date_value(payload, key):
    value = text_value(payload, key, max_length=10)
    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise ApiInputError(f"{key} must be a valid YYYY-MM-DD date.") from error


def employee_value(payload):
    value = payload.get("employeeId")
    if isinstance(value, bool):
        raise ApiInputError("employeeId must identify an employee.")
    try:
        employee_id = int(value)
    except (TypeError, ValueError) as error:
        raise ApiInputError("employeeId must identify an employee.") from error
    return get_object_or_404(Employee, pk=employee_id)


def employee_json(employee):
    return {
        "id": employee.pk,
        "name": employee.name,
        "email": employee.email,
        "role": employee.role,
        "department": employee.department,
        "status": employee.status,
    }


def leave_json(leave):
    return {
        "id": leave.pk,
        "employeeId": leave.employee_id,
        "name": leave.employee.name if leave.employee_id else leave.employee_name,
        "type": leave.leave_type,
        "from": leave.start_date.isoformat(),
        "to": leave.end_date.isoformat(),
        "reason": leave.reason,
        "status": leave.status,
    }


def attendance_json(record):
    return {
        "employeeId": record.employee_id,
        "date": record.date.isoformat(),
        "status": record.status,
    }


def attendance_request_json(request_record):
    return {
        "id": request_record.pk,
        "employeeId": request_record.employee_id,
        "name": request_record.employee.name if request_record.employee_id else request_record.employee_name,
        "date": request_record.date.isoformat(),
        "requestedStatus": request_record.requested_status,
        "issue": request_record.issue,
        "status": request_record.status,
    }


def task_json(task):
    return {
        "id": task.pk,
        "employeeId": task.employee_id,
        "name": task.employee.name if task.employee_id else task.employee_name,
        "title": task.title,
        "description": task.description,
        "dueDate": task.due_date.isoformat(),
        "priority": task.priority,
        "status": task.status,
    }


@api_methods("GET")
def bootstrap(_request):
    return JsonResponse(
        {
            "employees": [employee_json(item) for item in Employee.objects.order_by("id")],
            "leaves": [leave_json(item) for item in LeaveRequest.objects.select_related("employee")],
            "attendance": [
                attendance_json(item)
                for item in Attendance.objects.select_related("employee")
            ],
            "attendanceRequests": [
                attendance_request_json(item)
                for item in AttendanceRequest.objects.select_related("employee")
            ],
            "tasks": [task_json(item) for item in Task.objects.select_related("employee")],
        }
    )


@api_methods("GET", "POST")
def employees(request):
    if request.method == "GET":
        return JsonResponse(
            [employee_json(item) for item in Employee.objects.order_by("id")],
            safe=False,
        )

    payload = read_payload(request)
    email = text_value(payload, "email", max_length=254)
    try:
        validate_email(email)
    except ValidationError as error:
        raise ApiInputError("email must be a valid email address.") from error
    employee = Employee.objects.create(
        name=text_value(payload, "name", max_length=150),
        email=email,
        role=text_value(payload, "role", max_length=120),
        department=text_value(payload, "department", max_length=100),
        status=choice_value(payload, "status", Employee.EmploymentStatus.choices),
    )
    return JsonResponse(employee_json(employee), status=201)


@api_methods("GET", "PATCH", "DELETE")
def employee_detail(request, employee_id):
    employee = get_object_or_404(Employee, pk=employee_id)
    if request.method == "GET":
        return JsonResponse(employee_json(employee))
    if request.method == "DELETE":
        employee.delete()
        return HttpResponse(status=204)

    payload = read_payload(request)
    if "name" in payload:
        employee.name = text_value(payload, "name", max_length=150)
    if "email" in payload:
        email = text_value(payload, "email", max_length=254)
        try:
            validate_email(email)
        except ValidationError as error:
            raise ApiInputError("email must be a valid email address.") from error
        employee.email = email
    if "role" in payload:
        employee.role = text_value(payload, "role", max_length=120)
    if "department" in payload:
        employee.department = text_value(payload, "department", max_length=100)
    if "status" in payload:
        employee.status = choice_value(payload, "status", Employee.EmploymentStatus.choices)
    employee.save()
    return JsonResponse(employee_json(employee))


@api_methods("GET", "POST")
def leaves(request):
    if request.method == "GET":
        return JsonResponse(
            [
                leave_json(item)
                for item in LeaveRequest.objects.select_related("employee")
            ],
            safe=False,
        )

    payload = read_payload(request)
    employee = employee_value(payload)
    start_date = date_value(payload, "from")
    end_date = date_value(payload, "to")
    if end_date < start_date:
        raise ApiInputError("The leave end date cannot be before the start date.")
    leave = LeaveRequest.objects.create(
        employee=employee,
        employee_name=employee.name,
        leave_type=choice_value(payload, "type", LeaveRequest.LeaveType.choices),
        start_date=start_date,
        end_date=end_date,
        reason=text_value(payload, "reason", max_length=300),
    )
    return JsonResponse(leave_json(leave), status=201)


@api_methods("PATCH")
def leave_detail(request, leave_id):
    leave = get_object_or_404(LeaveRequest, pk=leave_id)
    payload = read_payload(request)
    leave.status = choice_value(payload, "status", LeaveRequest.RequestStatus.choices)
    leave.save(update_fields=["status"])
    return JsonResponse(leave_json(leave))


@api_methods("POST")
def attendance(request):
    payload = read_payload(request)
    employee = employee_value(payload)
    record_date = date_value(payload, "date")
    status = choice_value(payload, "status", Attendance.AttendanceStatus.choices)
    record, _created = Attendance.objects.update_or_create(
        employee=employee,
        date=record_date,
        defaults={"status": status},
    )
    return JsonResponse(attendance_json(record))


@api_methods("GET", "POST")
def attendance_requests(request):
    if request.method == "GET":
        return JsonResponse(
            [
                attendance_request_json(item)
                for item in AttendanceRequest.objects.select_related("employee")
            ],
            safe=False,
        )

    payload = read_payload(request)
    employee = employee_value(payload)
    request_date = date_value(payload, "date")
    if request_date > timezone.localdate():
        raise ApiInputError("Attendance corrections can only be requested for today or earlier.")
    attendance_request = AttendanceRequest.objects.create(
        employee=employee,
        employee_name=employee.name,
        date=request_date,
        requested_status=choice_value(
            payload,
            "requestedStatus",
            AttendanceRequest.RequestedStatus.choices,
        ),
        issue=text_value(payload, "issue", max_length=300),
    )
    return JsonResponse(attendance_request_json(attendance_request), status=201)


@api_methods("PATCH")
def attendance_request_detail(request, request_id):
    attendance_request = get_object_or_404(AttendanceRequest, pk=request_id)
    payload = read_payload(request)
    status = choice_value(payload, "status", AttendanceRequest.RequestStatus.choices)
    with transaction.atomic():
        attendance_request.status = status
        attendance_request.save(update_fields=["status"])
        if status == AttendanceRequest.RequestStatus.APPROVED and attendance_request.employee_id:
            Attendance.objects.update_or_create(
                employee_id=attendance_request.employee_id,
                date=attendance_request.date,
                defaults={"status": attendance_request.requested_status},
            )
    return JsonResponse(attendance_request_json(attendance_request))


@api_methods("GET", "POST")
def tasks(request):
    if request.method == "GET":
        return JsonResponse(
            [task_json(item) for item in Task.objects.select_related("employee")],
            safe=False,
        )

    payload = read_payload(request)
    employee = employee_value(payload)
    task = Task.objects.create(
        employee=employee,
        employee_name=employee.name,
        title=text_value(payload, "title", max_length=100),
        description=text_value(payload, "description", max_length=500, optional=True),
        due_date=date_value(payload, "dueDate"),
        priority=choice_value(payload, "priority", Task.Priority.choices),
    )
    return JsonResponse(task_json(task), status=201)


@api_methods("PATCH", "DELETE")
def task_detail(request, task_id):
    task = get_object_or_404(Task, pk=task_id)
    if request.method == "DELETE":
        task.delete()
        return HttpResponse(status=204)

    payload = read_payload(request)
    if "status" in payload:
        task.status = choice_value(payload, "status", Task.TaskStatus.choices)
    if "title" in payload:
        task.title = text_value(payload, "title", max_length=100)
    if "description" in payload:
        task.description = text_value(payload, "description", max_length=500, optional=True)
    if "dueDate" in payload:
        task.due_date = date_value(payload, "dueDate")
    if "priority" in payload:
        task.priority = choice_value(payload, "priority", Task.Priority.choices)
    task.save()
    return JsonResponse(task_json(task))
