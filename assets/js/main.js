(function () {
  var data = window.DR_KATHERINE_DATA;
  if (!data) {
    return;
  }

  function getBasePath() {
    var host = window.location.hostname || "";
    var pathname = window.location.pathname || "/";
    if (host.endsWith("github.io")) {
      var segments = pathname.split("/").filter(Boolean);
      if (segments.length > 0) {
        return "/" + segments[0];
      }
    }
    return "";
  }

  function localUrl(path) {
    if (typeof path !== "string") {
      return path;
    }
    if (!path.startsWith("/")) {
      return path;
    }
    return getBasePath() + path;
  }

  function setHTML(id, html) {
    var node = document.getElementById(id);
    if (node) {
      node.innerHTML = html;
    }
  }

  function iconSVG(kind) {
    if (kind === "heart") {
      return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 56c-1.3 0-2.5-.5-3.5-1.3C15.7 43.7 8 36.8 8 25.8 8 16.5 15.4 9 24.6 9c4.8 0 9.3 2.1 12.4 5.8C40 11.1 44.6 9 49.4 9 58.6 9 66 16.5 66 25.8c0 11-7.7 17.9-20.5 28.9-1 .8-2.2 1.3-3.5 1.3h-10z" transform="translate(-5 -1)"></path></svg>';
    }
    if (kind === "spark") {
      return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M31 6l6 15 15 6-15 6-6 15-6-15-15-6 15-6z"></path><circle cx="51" cy="51" r="6"></circle></svg>';
    }
    if (kind === "guide") {
      return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 10h24a8 8 0 0 1 8 8v36H20a8 8 0 0 0-8 8V10z"></path><path d="M44 18h8v44H28a8 8 0 0 1 8-8h8V18z"></path></svg>';
    }
    return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 54h44v4H10z"></path><path d="M16 46h8V26h-8zm12 0h8V18h-8zm12 0h8V10h-8z"></path></svg>';
  }

  function renderSocialProof() {
    var html = data.socialProof
      .map(function (item) {
        return (
          '<article class="stat-card reveal">' +
          '<h3>' + item.value + '</h3>' +
          '<p class="stat-title">' + item.label + '</p>' +
          '<p>' + item.detail + '</p>' +
          '</article>'
        );
      })
      .join("");
    setHTML("social-proof-grid", html);
  }

  function renderAdvantages() {
    var html = data.advantages
      .map(function (item) {
        return (
          '<article class="adv-card reveal">' +
          '<div class="adv-icon">' + iconSVG(item.icon) + '</div>' +
          '<h3>' + item.title + '</h3>' +
          '<p>' + item.description + '</p>' +
          '</article>'
        );
      })
      .join("");
    setHTML("advantages-grid", html);
  }

  function serviceCardTemplate(item, compact) {
    var bullets = item.bullets
      .map(function (bullet) {
        return "<li>" + bullet + "</li>";
      })
      .join("");
    var badges = item.bullets
      .slice(0, 3)
      .map(function (bullet) {
        return '<div class="service-badge">' + bullet + "</div>";
      })
      .join("");
    return (
      '<article class="service-card service-item reveal">' +
      '<div class="service-image-wrap">' +
      '<img class="service-image" src="' + localUrl("/assets/img/isotipo.png") + '" alt="Isotipo servicio pediátrico" loading="lazy" />' +
      '<div class="service-hover-wrap"><span class="service-hover-icon">+</span></div>' +
      "</div>" +
      '<div class="service-info">' +
      '<h3 class="service-title">' + item.title + '</h3>' +
      '<p class="service-description">' + item.summary + "</p>" +
      (compact ? '<div class="service-list-wrap">' + badges + "</div>" : '<ul class="service-list">' + bullets + "</ul>") +
      '<a class="text-link" href="' + localUrl(item.detailHref) + '">Ver detalle</a>' +
      "</div>" +
      '</article>'
    );
  }

  function renderServices() {
    setHTML(
      "home-services-grid",
      data.services
        .map(function (item) {
          return serviceCardTemplate(item, true);
        })
        .join("")
    );

    setHTML(
      "services-grid",
      data.services
        .map(function (item) {
          return serviceCardTemplate(item, false);
        })
        .join("")
    );
  }

  function renderDoctorInfo() {
    setHTML(
      "doctor-education-list",
      data.doctorProfile.education
        .map(function (line) {
          return "<li>" + line + "</li>";
        })
        .join("")
    );

    setHTML(
      "doctor-approach-list",
      data.doctorProfile.approach
        .map(function (line) {
          return "<li>" + line + "</li>";
        })
        .join("")
    );

    setHTML(
      "future-team-grid",
      data.futureTeam
        .map(function (item) {
          return (
            '<article class="future-team-card reveal">' +
            '<h3>' + item.role + '</h3>' +
            '<p>' + item.status + "</p>" +
            "</article>"
          );
        })
        .join("")
    );
  }

  function renderResources() {
    var html = data.resources
      .map(function (item) {
        return (
          '<article class="resource-card reveal">' +
          '<span class="pill">' + item.tag + '</span>' +
          '<h3>' + item.title + '</h3>' +
          '<p>' + item.excerpt + '</p>' +
          '<a class="text-link" href="' + localUrl(item.href) + '">Leer recurso</a>' +
          '</article>'
        );
      })
      .join("");

    setHTML("resources-home-grid", html);
    setHTML("resources-page-grid", html);
  }

  function renderBlog() {
    var html = data.blogPosts
      .map(function (post) {
        return (
          '<article class="blog-card reveal">' +
          '<div class="blog-meta"><span>' + post.category + '</span><span>' + post.readTime + '</span></div>' +
          '<h3>' + post.title + '</h3>' +
          '<p>' + post.excerpt + '</p>' +
          '<a class="text-link" href="' + localUrl(post.href) + '">Leer artículo</a>' +
          '</article>'
        );
      })
      .join("");

    setHTML("blog-home-grid", html);
    setHTML("blog-page-grid", html);
  }

  function renderTestimonials() {
    var slider = document.getElementById("testimonial-slider");
    if (!slider) {
      return;
    }

    var index = 0;
    function mount() {
      var item = data.testimonials[index];
      slider.innerHTML =
        '<figure class="testimonial reveal">' +
        '<blockquote>"' + item.quote + '"</blockquote>' +
        '<figcaption>' + item.author + "</figcaption>" +
        "</figure>";
    }

    mount();

    var prev = document.getElementById("testimonial-prev");
    var next = document.getElementById("testimonial-next");

    if (prev) {
      prev.addEventListener("click", function () {
        index = (index - 1 + data.testimonials.length) % data.testimonials.length;
        mount();
      });
    }

    if (next) {
      next.addEventListener("click", function () {
        index = (index + 1) % data.testimonials.length;
        mount();
      });
    }
  }

  function renderFaqs() {
    var html = data.faqs
      .map(function (faq) {
        return (
          '<details class="faq-item reveal">' +
          '<summary>' + faq.question + '</summary>' +
          '<p>' + faq.answer + '</p>' +
          '</details>'
        );
      })
      .join("");

    setHTML("faq-list", html);
  }

  function setupAgendaModule() {
    var module = document.getElementById("agenda-module");
    if (!module) {
      return;
    }

    var dateWrap = document.getElementById("agenda-date-list");
    var slotWrap = document.getElementById("agenda-slot-list");
    var selectedDateInput = document.getElementById("selected-date");
    var selectedTimeInput = document.getElementById("selected-time");
    var summary = document.getElementById("agenda-summary");
    var form = document.getElementById("appointment-form");
    var openAgenda = document.getElementById("open-agendatucita");

    if (openAgenda) {
      openAgenda.setAttribute("href", data.clinic.agendaUrl);
    }

    var times = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "15:00", "15:30", "16:00", "16:30"];

    var today = new Date();
    var selectedDate = null;
    var selectedTime = null;

    function formatDateLabel(date) {
      return date.toLocaleDateString("es-DO", {
        weekday: "short",
        day: "2-digit",
        month: "short"
      });
    }

    function formatDateValue(date) {
      return date.toISOString().slice(0, 10);
    }

    function updateSummary() {
      if (!summary) {
        return;
      }
      var datePart = selectedDate ? selectedDateInput.value : "Sin fecha";
      var timePart = selectedTime ? selectedTimeInput.value : "Sin horario";
      summary.textContent = "Seleccionado: " + datePart + " a las " + timePart;
    }

    function paintSlots() {
      if (!slotWrap) {
        return;
      }
      slotWrap.innerHTML = times
        .map(function (time) {
          var active = selectedTime === time ? " is-active" : "";
          return '<button class="slot-btn' + active + '" data-time="' + time + '" type="button">' + time + "</button>";
        })
        .join("");

      var buttons = slotWrap.querySelectorAll("button");
      buttons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          selectedTime = btn.getAttribute("data-time");
          if (selectedTimeInput) {
            selectedTimeInput.value = selectedTime;
          }
          paintSlots();
          updateSummary();
        });
      });
    }

    if (dateWrap) {
      var dates = [];
      for (var i = 0; i < 14; i += 1) {
        var d = new Date(today);
        d.setDate(today.getDate() + i);
        dates.push(d);
      }

      dateWrap.innerHTML = dates
        .map(function (date, idx) {
          var value = formatDateValue(date);
          var active = idx === 0 ? " is-active" : "";
          return '<button class="date-btn' + active + '" data-date="' + value + '" type="button">' + formatDateLabel(date) + "</button>";
        })
        .join("");

      var dateButtons = dateWrap.querySelectorAll("button");
      dateButtons.forEach(function (btn, idx) {
        btn.addEventListener("click", function () {
          dateButtons.forEach(function (other) {
            other.classList.remove("is-active");
          });
          btn.classList.add("is-active");
          selectedDate = dates[idx];
          if (selectedDateInput) {
            selectedDateInput.value = btn.getAttribute("data-date");
          }
          updateSummary();
        });
      });

      if (dateButtons[0]) {
        dateButtons[0].click();
      }
    }

    paintSlots();

    if (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!selectedDate || !selectedTime) {
          alert("Selecciona fecha y horario antes de enviar.");
          return;
        }

        var confirmation = document.getElementById("appointment-confirmation");
        if (confirmation) {
          confirmation.innerHTML =
            "Solicitud enviada. Fecha: <strong>" +
            selectedDateInput.value +
            "</strong> | Hora: <strong>" +
            selectedTimeInput.value +
            "</strong>.\nTe contactaremos para confirmar disponibilidad final.";
          confirmation.classList.add("is-visible");
        }

        form.reset();
        selectedTime = null;
        if (selectedDate && selectedDateInput) {
          selectedDateInput.value = formatDateValue(selectedDate);
        }
        if (selectedTimeInput) {
          selectedTimeInput.value = "";
        }
        paintSlots();
        updateSummary();
      });
    }
  }

  function setupContactForm() {
    var form = document.getElementById("contact-form");
    if (!form) {
      return;
    }
    var message = document.getElementById("contact-confirmation");

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (message) {
        message.textContent = "Gracias. Tu mensaje fue enviado correctamente. Te responderemos en breve.";
        message.classList.add("is-visible");
      }
      form.reset();
    });
  }

  function setupReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length || !("IntersectionObserver" in window)) {
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px"
      }
    );

    items.forEach(function (item) {
      observer.observe(item);
    });
  }

  renderSocialProof();
  renderAdvantages();
  renderServices();
  renderDoctorInfo();
  renderResources();
  renderBlog();
  renderTestimonials();
  renderFaqs();
  setupAgendaModule();
  setupContactForm();
  setupReveal();
})();
