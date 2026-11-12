from django.conf import settings
from django.contrib import admin
from django.http import Http404, JsonResponse
from django.urls import include, path
from django.views.static import serve


def frontend_file(request, filename):
    if not settings.DEBUG:
        raise Http404
    return serve(request, filename, document_root=settings.FRONTEND_DIR)


def frontend_script(request, filename):
    if not settings.DEBUG:
        raise Http404
    return serve(request, filename, document_root=settings.FRONTEND_DIR / "js")


def health_check(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check, name="api-health"),
    path("api/", include("api.urls")),
    path("", frontend_file, {"filename": "index.html"}, name="frontend-home"),
    path("employee.html", frontend_file, {"filename": "employee.html"}, name="employee-dashboard"),
    path("style.css", frontend_file, {"filename": "style.css"}, name="frontend-styles"),
    path("app.js", frontend_file, {"filename": "app.js"}, name="frontend-app"),
    path("js/<path:filename>", frontend_script, name="frontend-script"),
]
