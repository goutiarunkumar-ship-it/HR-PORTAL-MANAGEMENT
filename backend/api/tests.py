import json
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from django.test import override_settings

from .models import Attendance, AttendanceRequest, Employee, LeaveRequest, Task


class PeopleDeskApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.employee = Employee.objects.create(
            name="Test Employee",
            email="test.employee@example.com",
            role="Developer",
            department="Engineering",
        )

    def test_bootstrap_returns_all_data_groups(self):
        response = self.client.get("/api/bootstrap/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            set(response.json()),
            {"employees", "leaves", "attendance", "attendanceRequests", "tasks"},
        )
        self.assertEqual(response.json()["employees"][0]["id"], self.employee.pk)

    @override_settings(CORS_ALLOWED_ORIGINS=["https://people-desk-demo.netlify.app"])
    def test_api_allows_configured_netlify_origin(self):
        response = self.client.get(
            "/api/bootstrap/",
            HTTP_ORIGIN="https://people-desk-demo.netlify.app",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response["Access-Control-Allow-Origin"],
            "https://people-desk-demo.netlify.app",
        )

    @override_settings(CORS_ALLOWED_ORIGINS=["https://people-desk-demo.netlify.app"])
    def test_api_allows_cross_origin_json_preflight(self):
        response = self.client.options(
            "/api/tasks/1/",
            HTTP_ORIGIN="https://people-desk-demo.netlify.app",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="PATCH",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="content-type",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response["Access-Control-Allow-Origin"],
            "https://people-desk-demo.netlify.app",
        )
        self.assertIn("PATCH", response["Access-Control-Allow-Methods"])

    def test_task_creation_is_persisted_and_returned_in_bootstrap(self):
        response = self.client.post(
            "/api/tasks/",
            data=json.dumps(
                {
                    "employeeId": self.employee.pk,
                    "title": "Prepare report",
                    "description": "Review the monthly results.",
                    "dueDate": (timezone.localdate() + timedelta(days=2)).isoformat(),
                    "priority": "High",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        task = Task.objects.get()
        self.assertEqual(task.employee, self.employee)
        self.assertEqual(self.client.get("/api/bootstrap/").json()["tasks"][0]["title"], "Prepare report")

    def test_attendance_marking_updates_the_daily_record(self):
        payload = {
            "employeeId": self.employee.pk,
            "date": timezone.localdate().isoformat(),
            "status": "Present",
        }
        first_response = self.client.post(
            "/api/attendance/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        payload["status"] = "Absent"
        second_response = self.client.post(
            "/api/attendance/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 200)
        self.assertEqual(Attendance.objects.count(), 1)
        self.assertEqual(Attendance.objects.get().status, "Absent")

    def test_leave_request_rejects_reversed_dates(self):
        start = timezone.localdate() + timedelta(days=2)
        response = self.client.post(
            "/api/leaves/",
            data=json.dumps(
                {
                    "employeeId": self.employee.pk,
                    "type": "Casual Leave",
                    "from": start.isoformat(),
                    "to": (start - timedelta(days=1)).isoformat(),
                    "reason": "Test",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("end date", response.json()["error"])

    def test_leave_request_is_saved_for_employee(self):
        start = timezone.localdate() + timedelta(days=2)
        response = self.client.post(
            "/api/leaves/",
            data=json.dumps(
                {
                    "employeeId": self.employee.pk,
                    "type": "Casual Leave",
                    "from": start.isoformat(),
                    "to": (start + timedelta(days=1)).isoformat(),
                    "reason": "Family event",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(LeaveRequest.objects.get().employee, self.employee)
        self.assertEqual(response.json()["name"], self.employee.name)

    def test_approved_attendance_request_writes_attendance(self):
        request = AttendanceRequest.objects.create(
            employee=self.employee,
            employee_name=self.employee.name,
            date=timezone.localdate() - timedelta(days=1),
            requested_status=AttendanceRequest.RequestedStatus.PRESENT,
            issue="Missed check-in",
        )
        response = self.client.patch(
            f"/api/attendance-requests/{request.pk}/",
            data=json.dumps({"status": "Approved"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "Approved")
        self.assertEqual(Attendance.objects.get().status, "Present")
