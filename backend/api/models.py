from django.db import models


class Employee(models.Model):
    class EmploymentStatus(models.TextChoices):
        ACTIVE = "Active", "Active"
        ON_LEAVE = "On Leave", "On Leave"

    name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=120)
    department = models.CharField(max_length=100)
    status = models.CharField(
        max_length=20,
        choices=EmploymentStatus.choices,
        default=EmploymentStatus.ACTIVE,
    )

    def __str__(self):
        return self.name


class LeaveRequest(models.Model):
    class LeaveType(models.TextChoices):
        CASUAL = "Casual Leave", "Casual Leave"
        SICK = "Sick Leave", "Sick Leave"
        PERSONAL = "Personal Leave", "Personal Leave"
        ANNUAL = "Annual Leave", "Annual Leave"

    class RequestStatus(models.TextChoices):
        PENDING = "Pending", "Pending"
        APPROVED = "Approved", "Approved"
        REJECTED = "Rejected", "Rejected"

    employee = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        related_name="leave_requests",
        null=True,
        blank=True,
    )
    employee_name = models.CharField(max_length=150)
    leave_type = models.CharField(max_length=30, choices=LeaveType.choices)
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.CharField(max_length=300)
    status = models.CharField(
        max_length=20,
        choices=RequestStatus.choices,
        default=RequestStatus.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.employee_name}: {self.leave_type}"


class Attendance(models.Model):
    class AttendanceStatus(models.TextChoices):
        PRESENT = "Present", "Present"
        ABSENT = "Absent", "Absent"

    employee = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        related_name="attendance_records",
        null=True,
        blank=True,
    )
    date = models.DateField()
    status = models.CharField(max_length=10, choices=AttendanceStatus.choices)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "date"],
                name="unique_attendance_per_employee_per_day",
            )
        ]
        ordering = ["-date", "employee_id"]

    def __str__(self):
        return f"{self.employee or 'Former employee'}: {self.date} ({self.status})"


class AttendanceRequest(models.Model):
    class RequestedStatus(models.TextChoices):
        PRESENT = "Present", "Present"
        ABSENT = "Absent", "Absent"

    class RequestStatus(models.TextChoices):
        PENDING = "Pending", "Pending"
        APPROVED = "Approved", "Approved"
        REJECTED = "Rejected", "Rejected"

    employee = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        related_name="attendance_requests",
        null=True,
        blank=True,
    )
    employee_name = models.CharField(max_length=150)
    date = models.DateField()
    requested_status = models.CharField(max_length=10, choices=RequestedStatus.choices)
    issue = models.CharField(max_length=300)
    status = models.CharField(
        max_length=20,
        choices=RequestStatus.choices,
        default=RequestStatus.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.employee_name}: attendance correction for {self.date}"


class Task(models.Model):
    class Priority(models.TextChoices):
        LOW = "Low", "Low"
        MEDIUM = "Medium", "Medium"
        HIGH = "High", "High"

    class TaskStatus(models.TextChoices):
        TO_DO = "To do", "To do"
        IN_PROGRESS = "In Progress", "In Progress"
        COMPLETED = "Completed", "Completed"

    employee = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        related_name="assigned_tasks",
        null=True,
        blank=True,
    )
    employee_name = models.CharField(max_length=150)
    title = models.CharField(max_length=100)
    description = models.CharField(max_length=500, blank=True)
    due_date = models.DateField()
    priority = models.CharField(max_length=10, choices=Priority.choices)
    status = models.CharField(
        max_length=20,
        choices=TaskStatus.choices,
        default=TaskStatus.TO_DO,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["status", "due_date", "-created_at"]

    def __str__(self):
        return self.title
