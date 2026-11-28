"""Exercise the built bundle in a real browser with synthetic, read-only API fixtures.

Not a live API, security certification or visual approval. Runs only against loopback.
"""
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

DIST = Path(__file__).resolve().parents[2] / "dist"
EMPTY_PAGE = {"items": [], "page": 0, "size": 20, "total": 0, "unseen": 0}
CLINIC = {"id": "synthetic-clinic", "name": "Clinique de test"}


class StaticApp(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def do_GET(self):
        if not Path(self.translate_path(self.path)).is_file():
            self.path = "/index.html"
        super().do_GET()

    def log_message(self, *_args):
        pass


def install_fixtures(context, origin, role):
    def respond(route):
        path = urlsplit(route.request.url).path.removeprefix("/api")
        if route.request.method != "GET":
            route.fulfill(status=405, json={"code": "METHOD_NOT_ALLOWED", "message": "Test en lecture seule"})
            return
        if path == "/auth/me":
            if role is None:
                route.fulfill(status=401, json={"code": "UNAUTHENTICATED", "message": "Non connecté"})
                return
            data = {"user": {"id": "synthetic-user", "email": "test@example.invalid",
                             "firstName": "Test", "lastName": "Synthétique", "roles": [role]}}
        elif path == "/auth/consent":
            data = {"version": "synthetic", "text": "Consentement synthétique pour les tests.", "required": True}
        elif path in ("/slots/filters", "/admin/slots/filters"):
            data = {"specialties": [], "clinics": [], "practitioners": []}
        elif path == "/practitioner/agenda":
            data = {"clinics": [CLINIC], "items": []}
        elif path in ("/practitioner/alerts", "/practitioner/absences", "/admin/practitioners"):
            data = []
        elif path in ("/appointments/me", "/admin/users", "/admin/audit-entries", "/slots"):
            data = EMPTY_PAGE
        else:
            route.fulfill(status=404, json={"code": "NOT_FOUND", "message": "Fixture non définie"})
            return
        route.fulfill(status=200, json=data)

    def local_only(route):
        if route.request.url.startswith(origin + "/"):
            route.continue_()
        else:
            route.abort()

    context.route("**/*", local_only)
    context.route(origin + "/api/**", respond)


def assert_layout(page):
    assert page.locator("main").count() == 1, "Expected exactly one main region"
    assert page.locator("h1").count() == 1, "Expected exactly one page heading"
    width = page.evaluate("document.documentElement.scrollWidth - innerWidth")
    assert width <= 2, f"Page-level horizontal overflow: {width}px at {page.url}"


def exercise_public(page, origin):
    page.goto(origin + "/")
    expect(page.get_by_role("heading", level=1)).to_contain_text("Vos soins commencent")
    assert_layout(page)
    faq = page.get_by_role("button", name="Ai-je besoin d’un compte pour réserver ?")
    faq.focus()
    page.keyboard.press("Enter")
    expect(faq).to_have_attribute("aria-expanded", "true")
    page.keyboard.press("Space")
    expect(faq).to_have_attribute("aria-expanded", "false")
    page.get_by_role("link", name="Prendre rendez-vous").click()
    expect(page.get_by_role("heading", name="Connexion", exact=True)).to_be_visible()
    assert_layout(page)


def exercise_space(page, origin, root, title, link, destination, heading, mobile):
    page.goto(origin + root)
    expect(page.get_by_role("heading", level=1, name=title)).to_be_visible()
    expect(page.get_by_role("heading", name="Bonjour Test")).to_be_visible()
    assert_layout(page)
    menu = page.get_by_role("navigation", name="Menu de l’espace")
    if mobile:
        toggle = page.get_by_role("button", name="Menu", exact=True)
        expect(toggle).to_have_attribute("aria-expanded", "false")
        toggle.click()
        expect(menu).to_be_visible()
        menu.get_by_role("link", name="Accueil", exact=True).focus()
        page.keyboard.press("Escape")
        expect(toggle).to_have_attribute("aria-expanded", "false")
        expect(toggle).to_be_focused()
        toggle.click()
    item = menu.get_by_role("link", name=link, exact=True)
    expect(item).to_have_attribute("href", destination)
    item.click()
    expect(page.get_by_role("heading", name=heading, exact=True)).to_be_visible()
    if mobile:
        expect(toggle).to_have_attribute("aria-expanded", "false")
        expect(menu).not_to_be_visible()
    else:
        expect(item).to_have_attribute("aria-current", "page")
    assert_layout(page)


def main():
    assert (DIST / "index.html").is_file(), "Run npm run build first"
    server = ThreadingHTTPServer(("127.0.0.1", 0), StaticApp)
    Thread(target=server.serve_forever, daemon=True).start()
    origin = f"http://127.0.0.1:{server.server_port}"
    scenarios = [
        (None, None),
        ("PATIENT", ("/patient", "Espace patient", "Rendez-vous", "/patient/rendez-vous", "Mes rendez-vous")),
        ("PRACTITIONER", ("/praticien", "Espace praticien", "Absences", "/praticien/absences", "Mes absences")),
        ("ADMINISTRATIVE_STAFF", ("/admin", "Espace administratif", "Réserver pour un patient",
                                  "/admin/reservation", "Réserver pour un patient")),
    ]
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            for width in (1440, 390):
                for role, scenario in scenarios:
                    context = browser.new_context(viewport={"width": width, "height": 900}, reduced_motion="reduce")
                    install_fixtures(context, origin, role)
                    page = context.new_page()
                    errors = []
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    try:
                        if scenario is None:
                            exercise_public(page, origin)
                        else:
                            exercise_space(page, origin, *scenario, mobile=width < 760)
                        assert not errors, json.dumps(errors, ensure_ascii=False)
                        print(f"PASS {role or 'PUBLIC'} {width}px")
                    finally:
                        context.close()
            browser.close()
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()
