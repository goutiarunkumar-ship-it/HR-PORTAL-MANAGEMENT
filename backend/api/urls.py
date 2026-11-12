from django.urls import path

from . import views


urlpatterns = [
    path("bootstrap/", views.bootstrap, name="api-bootstrap"),
    path("employees/", views.employees, name="api-employees"),
    path("employees/<int:employee_id>/", views.employee_detail, name="api-employee-detail"),
    path("leaves/", views.leaves, name="api-leaves"),
    path("leaves/<int:leave_id>/", views.leave_detail, name="api-leave-detail"),
    path("attendance/", views.attendance, name="api-attendance"),
    path("attendance-requests/", views.attendance_requests, name="api-attendance-requests"),
    path(
        "attendance-requests/<int:request_id>/",
        views.attendance_request_detail,
        name="api-attendance-request-detail",
    ),
    path("tasks/", views.tasks, name="api-tasks"),
    path("tasks/<int:task_id>/", views.task_detail, name="api-task-detail"),
]
