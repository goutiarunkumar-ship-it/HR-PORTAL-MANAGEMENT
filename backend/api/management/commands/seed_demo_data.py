from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from api.models import AttendanceRequest, Employee, LeaveRequest, Task


class Command(BaseCommand):
    help = "Create the PeopleDesk sample employees, leave requests, and tasks."

    def handle(self, *args, **options):
        if Employee.objects.exists():
            raise CommandError(
                "Employees already exist. The demo seed command will not overwrite existing data."
            )

        employees = {}
        employee_rows = [
            ("Olivia Rhye", "olivia@company.com", "Product Designer", "Design", "Active"),
            ("Phoenix Baker", "phoenix@company.com", "Frontend Developer", "Engineering", "Active"),
            ("Lana Steiner", "lana@company.com", "HR Manager", "Human Resources", "Active"),
            ("Demi Wilkinson", "demi@company.com", "Data Analyst", "Analytics", "On Leave"),
            ("Candice Wu", "candice@company.com", "Marketing Lead", "Marketing", "Active"),
            ("Natali Craig", "natali@company.com", "QA Engineer", "Engineering", "Active"),
        ]
        for name, email, role, department, status in employee_rows:
            employees[name] = Employee.objects.create(
                name=name,
                email=email,
                role=role,
                department=department,
                status=status,
            )

        today = timezone.localdate()
        LeaveRequest.objects.bulk_create(
            [
                LeaveRequest(
                    employee=employees["Demi Wilkinson"],
                    employee_name="Demi Wilkinson",
                    leave_type=LeaveRequest.LeaveType.CASUAL,
                    start_date=today + timedelta(days=2),
                    end_date=today + timedelta(days=3),
                    reason="Personal time",
                    status=LeaveRequest.RequestStatus.PENDING,
                ),
                LeaveRequest(
                    employee=employees["Phoenix Baker"],
                    employee_name="Phoenix Baker",
                    leave_type=LeaveRequest.LeaveType.SICK,
                    start_date=today - timedelta(days=2),
                    end_date=today - timedelta(days=2),
                    reason="Not feeling well",
                    status=LeaveRequest.RequestStatus.APPROVED,
                ),
                LeaveRequest(
                    employee=employees["Candice Wu"],
                    employee_name="Candice Wu",
                    leave_type=LeaveRequest.LeaveType.PERSONAL,
                    start_date=today + timedelta(days=6),
                    end_date=today + timedelta(days=7),
                    reason="Personal appointment",
                    status=LeaveRequest.RequestStatus.PENDING,
                ),
            ]
        )
        task_rows = [
            (
                "Olivia Rhye",
                "Prepare design review",
                "Share the updated dashboard concepts with the product team.",
                2,
                Task.Priority.HIGH,
                Task.TaskStatus.IN_PROGRESS,
            ),
            (
                "Phoenix Baker",
                "Review pull requests",
                "Review the open frontend changes before the release.",
                4,
                Task.Priority.MEDIUM,
                Task.TaskStatus.TO_DO,
            ),
            (
                "Natali Craig",
                "Run regression checks",
                "Complete the quality checklist for the latest build.",
                5,
                Task.Priority.MEDIUM,
                Task.TaskStatus.TO_DO,
            ),
        ]
        for name, title, description, days, priority, status in task_rows:
            Task.objects.create(
                employee=employees[name],
                employee_name=name,
                title=title,
                description=description,
                due_date=today + timedelta(days=days),
                priority=priority,
                status=status,
            )

        self.stdout.write(self.style.SUCCESS("PeopleDesk demo data created."))
