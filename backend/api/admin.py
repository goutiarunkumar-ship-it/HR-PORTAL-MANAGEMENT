from django.contrib import admin

from .models import Attendance, AttendanceRequest, Employee, LeaveRequest, Task


admin.site.register(Employee)
admin.site.register(LeaveRequest)
admin.site.register(Attendance)
admin.site.register(AttendanceRequest)
admin.site.register(Task)
