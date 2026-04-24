  (function () {
  var STORAGE_KEY = "dr_katherine_lang";
  var DEFAULT_LANG = "es";
  var SUPPORTED_LANGS = {
    en: true,
    es: true
  };

  var listeners = [];
  var textSourceMap = new WeakMap();
  var attrSourceMap = new WeakMap();
  var pending = false;
  var applying = false;
  var externalDictRaw = window.DR_KATHERINE_I18N_DICT || {};
  var externalDict = {};
  var externalDictLower = {};
  var reverseExternalDict = {};
  var reverseExternalDictLower = {};
  var reverseWordMap = {};
  var AMBIGUOUS_ENGLISH_WORDS = {
    "a": true,
    "an": true
  };

  var PHRASE_MAP = [
    ["Sobre la doctora", "About the doctor"],
    ["Servicios pediátricos", "Pediatric services"],
    ["Recursos para padres", "Parent resources"],
    ["Contacto", "Contact"],
    ["Citas", "Appointments"],
    ["Una prioridad", "A priority"],
    ["Ruta pediátrica por edad", "Pediatric route by age"],
    ["Señales de alerta", "Warning signs"],
    ["Mini asistente pre-cita", "Pre-appointment mini assistant"],
    ["Centro de recursos premium", "Premium resource center"],
    ["Inicio", "Home"],
    ["Política de privacidad", "Privacy policy"],
    ["Términos y condiciones", "Terms and conditions"],
    ["Mapa del sitio", "Site map"],
    ["Horarios", "Office hours"],
    ["Citas en línea", "Online appointments"],
    ["Todos los derechos reservados.", "All rights reserved."],
    ["Este sitio ofrece información general y no sustituye una evaluación médica presencial.", "This site provides general information and does not replace an in-person medical evaluation."],
    ["Powered by", "Powered by"],
    ["Cultivando inicios felices y saludables.", "Nurturing happy, healthy beginnings."],
    ["Clínica pediátrica", "Pediatric Clinic"],
    ["Punta Cana Village", "Punta Cana Village"],
    ["Pediatra certificada por American Board", "American Board Certified Pediatrician"],
    ["Próximamente", "Coming Soon"],
    ["Paso 1", "Step 1"],
    ["Paso 2", "Step 2"],
    ["Paso 3", "Step 3"],
    ["Fechas disponibles", "Available dates"],
    ["Horarios disponibles", "Available time slots"],
    ["Preguntas frecuentes", "Frequently asked questions"],
    ["Información sobre citas y consultas", "Appointment and consultation information"],
    ["Estamos trabajando en la versión completa del sitio. Muy pronto todos los módulos estarán habilitados.", "We are working on the full version of the site. Very soon all modules will be enabled."],
    ["Nuevo consultorio en Punta Cana Village", "New clinic in Punta Cana Village"],
    ["Conocer a la doctora", "Meet the doctor"],
    ["Solicitar cita", "Request appointment"],
    ["Solicitar cita ahora", "Request appointment now"],
    ["Solicitar información", "Request information"],
    ["Solicitar orientación", "Request guidance"],
    ["Ver todos los recursos", "View all resources"],
    ["Ver todos los servicios", "View all services"],
    ["Explorar todos los servicios", "Explore all services"],
    ["Explorar recursos", "Explore resources"],
    ["Volver a recursos", "Back to resources"],
    ["Volver a servicios", "Back to services"],
    ["Volver a la portada principal", "Back to main page"],
    ["No encontramos esta página", "We couldn't find this page"],
    ["Error 404", "Error 404"],
    ["No reemplaza evaluación médica presencial ni diagnóstico clínico individual.", "It does not replace an in-person medical evaluation or an individual clinical diagnosis."],
    ["Agendar cita", "Schedule appointment"],
    ["Agendar consulta", "Schedule consultation"],
    ["Agendar revisión", "Schedule checkup"],
    ["Contactar consultorio", "Contact clinic"],
    ["Contactarnos", "Contact us"],
    ["Guardar solicitud", "Save request"],
    ["Limpiar formulario", "Clear form"],
    ["Limpiar historial local", "Clear local history"],
    ["Enviar mensaje", "Send message"],
    ["Enviar resumen por WhatsApp", "Send summary via WhatsApp"],
    ["Aún no hay solicitudes recientes en este dispositivo.", "There are no recent requests on this device yet."],
    ["Eliminar", "Delete"],
    ["Seleccionado:", "Selected:"],
    ["Sin fecha", "No date"],
    ["Sin horario", "No time"],
    ["Solicitud de cita pediátrica", "Pediatric appointment request"],
    ["Fecha:", "Date:"],
    ["Hora:", "Time:"],
    ["Paciente:", "Patient:"],
    ["Tutor:", "Parent/Guardian:"],
    ["Teléfono:", "Phone:"],
    ["Motivo:", "Reason:"],
    ["Borrador local", "Local draft"],
    ["Pendiente de confirmación", "Pending confirmation"],
    ["Completa los campos obligatorios para continuar.", "Complete the required fields to continue."],
    ["No fue posible procesar la solicitud. Inténtalo nuevamente.", "The request could not be processed. Please try again."],
    ["Selecciona fecha y horario antes de enviar.", "Select date and time before submitting."],
    ["Ingresa un teléfono válido para confirmar la cita.", "Enter a valid phone number to confirm the appointment."],
    ["La edad del paciente debe estar entre 0 y 18 años.", "Patient age must be between 0 and 18 years."],
    ["Describe el motivo de consulta con más detalle (mínimo 8 caracteres).", "Describe the reason for consultation in more detail (minimum 8 characters)."],
    ["Ese horario ya está ocupado para la fecha seleccionada. Elige otro.", "That time slot is already taken for the selected date. Choose another."],
    ["Ese horario acaba de ocuparse. Elige otro horario disponible para continuar.", "That time slot was just taken. Choose another available slot to continue."],
    ["No se pudo enviar la solicitud al servidor. Puedes reintentar o contactar por WhatsApp.", "Could not send the request to the server. You can retry or contact via WhatsApp."],
    ["Solicitud guardada localmente en este dispositivo. Configura la API para enviarla al consultorio.", "Request saved locally on this device. Configure the API to send it to the clinic."],
    ["Completa los campos requeridos para enviar tu consulta.", "Complete the required fields to send your inquiry."],
    ["Ingresa un teléfono válido para poder responderte.", "Enter a valid phone number so we can reply."],
    ["El mensaje debe tener al menos 10 caracteres.", "The message must be at least 10 characters."],
    ["Mensaje enviado correctamente. Te responderemos en el horario de atención.", "Message sent successfully. We will reply during office hours."],
    ["No se pudo enviar tu mensaje al servidor. Intenta nuevamente o contáctanos por WhatsApp.", "Your message could not be sent to the server. Try again or contact us via WhatsApp."],
    ["No se encontró un correo de destino configurado. Intenta por WhatsApp.", "No destination email is configured. Try WhatsApp."],
    ["Se abrió tu aplicación de correo para completar el envío del mensaje.", "Your email app was opened to complete message sending."],
    ["No se configuró una URL válida de API.", "A valid API URL is not configured."],
    ["La solicitud tardó demasiado. Intenta nuevamente.", "The request took too long. Please try again."],
    ["No fue posible conectar con el servidor.", "Could not connect to the server."],
    ["El servidor devolvió un error al procesar la solicitud.", "The server returned an error while processing the request."],
    ["Navegación principal", "Main navigation"],
    ["Abrir menú", "Open menu"],
    ["Ir al inicio de", "Go to homepage of"],
    ["Lenguaje", "Language"],
    ["Idioma", "Language"],
    ["Español", "Spanish"],
    ["Inglés", "English"],
    ["Consulta web -", "Web inquiry -"],
    ["Nombre:", "Name:"],
    ["Correo:", "Email:"],
    ["Tema:", "Topic:"],
    ["Mensaje:", "Message:"],
    ["general", "general"],
    ["otro", "other"],
    ["agenda", "appointments"],
    ["servicios", "services"],
    ["seguimiento", "follow-up"]
  ];

  var WORD_MAP = {
    "a": "to",
    "acceso": "access",
    "acciones": "actions",
    "acompañamiento": "support",
    "acude": "go",
    "actualización": "update",
    "actualizado": "updated",
    "actualizar": "update",
    "agenda": "appointments",
    "agendar": "schedule",
    "agendamiento": "appointment booking",
    "ahora": "now",
    "alimentación": "nutrition",
    "años": "years",
    "artículo": "article",
    "artículos": "articles",
    "atención": "care",
    "aquí": "here",
    "autorizo": "I authorize",
    "ayudarte": "help you",
    "borrador": "draft",
    "calendario": "schedule",
    "canales": "channels",
    "caracteres": "characters",
    "casa": "home",
    "caso": "case",
    "centro": "center",
    "cercano": "nearby",
    "cita": "appointment",
    "citas": "appointments",
    "claro": "clear",
    "clínica": "clinic",
    "clínico": "clinical",
    "completa": "complete",
    "completo": "full",
    "completa": "complete",
    "confirmación": "confirmation",
    "confirmar": "confirm",
    "consulta": "consultation",
    "consulta": "consultation",
    "consultas": "consultations",
    "consultorio": "clinic",
    "contacta": "contact",
    "contactar": "contact",
    "contacto": "contact",
    "continuar": "continue",
    "correo": "email",
    "cuándo": "when",
    "cuidado": "care",
    "datos": "data",
    "de": "of",
    "del": "of the",
    "detallado": "detailed",
    "detalle": "details",
    "diagnóstico": "diagnosis",
    "disponible": "available",
    "dispositivo": "device",
    "doctora": "doctor",
    "doctora": "doctor",
    "dónde": "where",
    "edad": "age",
    "educación": "education",
    "el": "the",
    "en": "in",
    "encuentra": "find",
    "enfermedad": "disease",
    "enfermedades": "diseases",
    "enviar": "send",
    "envío": "sending",
    "equipo": "team",
    "es": "is",
    "escuela": "school",
    "esquema": "schedule",
    "esta": "this",
    "este": "this",
    "evaluación": "evaluation",
    "familia": "family",
    "familias": "families",
    "fecha": "date",
    "fiebre": "fever",
    "formulario": "form",
    "formularios": "forms",
    "general": "general",
    "guía": "guide",
    "guías": "guides",
    "historial": "history",
    "hijo": "child",
    "hijos": "children",
    "hora": "time",
    "horario": "time slot",
    "horarios": "hours",
    "hoy": "today",
    "idioma": "language",
    "importante": "important",
    "incluye": "includes",
    "información": "information",
    "inglés": "english",
    "ingresa": "enter",
    "inmediato": "immediate",
    "integral": "comprehensive",
    "integrativa": "integrative",
    "la": "the",
    "las": "the",
    "leves": "mild",
    "llama": "call",
    "llamada": "call",
    "llamar": "call",
    "local": "local",
    "los": "the",
    "lugar": "place",
    "manejando": "managing",
    "manejo": "management",
    "médica": "medical",
    "médicas": "medical",
    "médico": "medical",
    "médicos": "medical",
    "mensaje": "message",
    "mensajes": "messages",
    "mes": "month",
    "lunes": "Monday",
    "lun": "Mon",
    "martes": "Tuesday",
    "mar": "Tue",
    "miércoles": "Wednesday",
    "miercoles": "Wednesday",
    "mié": "Wed",
    "mie": "Wed",
    "jueves": "Thursday",
    "jue": "Thu",
    "viernes": "Friday",
    "vie": "Fri",
    "sábado": "Saturday",
    "sabado": "Saturday",
    "sáb": "Sat",
    "sab": "Sat",
    "domingo": "Sunday",
    "dom": "Sun",
    "enero": "January",
    "ene": "Jan",
    "febrero": "February",
    "feb": "Feb",
    "marzo": "March",
    "abril": "April",
    "abr": "Apr",
    "mayo": "May",
    "junio": "June",
    "jun": "Jun",
    "julio": "July",
    "jul": "Jul",
    "agosto": "August",
    "ago": "Aug",
    "septiembre": "September",
    "setiembre": "September",
    "sep": "Sep",
    "octubre": "October",
    "oct": "Oct",
    "noviembre": "November",
    "nov": "Nov",
    "diciembre": "December",
    "dic": "Dec",
    "módulos": "modules",
    "motivo": "reason",
    "muy": "very",
    "más": "more",
    "navegación": "navigation",
    "niño": "child",
    "niños": "children",
    "no": "not",
    "nombre": "name",
    "nueva": "new",
    "nuevo": "new",
    "o": "or",
    "obligatorios": "required",
    "ocupado": "booked",
    "ocupada": "booked",
    "online": "online",
    "orientación": "guidance",
    "padres": "parents",
    "paciente": "patient",
    "pacientes": "patients",
    "pediatra": "pediatrician",
    "pediatría": "pediatrics",
    "pediátrica": "pediatric",
    "pediátrico": "pediatric",
    "pendiente": "pending",
    "perfil": "profile",
    "personalizado": "personalized",
    "plan": "plan",
    "plataforma": "platform",
    "política": "policy",
    "por": "by",
    "para": "for",
    "privacidad": "privacy",
    "procesar": "process",
    "profesional": "professional",
    "pronto": "soon",
    "próximo": "next",
    "publicación": "publication",
    "página": "page",
    "que": "that",
    "qué": "what",
    "reciente": "recent",
    "recursos": "resources",
    "registro": "record",
    "requeridos": "required",
    "responder": "respond",
    "responderemos": "we will respond",
    "revisión": "review",
    "ruta": "route",
    "salud": "health",
    "se": "it",
    "seguridad": "safety",
    "seguimiento": "follow-up",
    "selecciona": "select",
    "seleccionado": "selected",
    "selección": "selection",
    "servicio": "service",
    "servicios": "services",
    "si": "if",
    "sitio": "site",
    "solicita": "request",
    "solicitar": "request",
    "solicitud": "request",
    "solicitudes": "requests",
    "su": "its",
    "tardó": "took",
    "te": "you",
    "tema": "topic",
    "temperatura": "temperature",
    "teléfono": "phone",
    "tiene": "has",
    "tiempo": "time",
    "toda": "all",
    "todo": "all",
    "trabajando": "working",
    "tratamiento": "treatment",
    "tutor": "guardian",
    "tu": "your",
    "tus": "your",
    "un": "a",
    "una": "a",
    "urgencia": "emergency",
    "urgencias": "emergency care",
    "uso": "use",
    "usuario": "user",
    "válida": "valid",
    "válido": "valid",
    "versión": "version",
    "ver": "view",
    "web": "web",
    "whatsapp": "WhatsApp",
    "y": "and",
    "ya": "already"
  };

  function getStoredLang() {
    try {
      return String(window.localStorage.getItem(STORAGE_KEY) || "").trim().toLowerCase();
    } catch (error) {
      return "";
    }
  }

  function normalizeDictionaryKey(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function countMatches(text, regex) {
    var matches = text.match(regex);
    return matches ? matches.length : 0;
  }

  function isLikelySpanish(value) {
    var sample = normalizeDictionaryKey(value).toLowerCase();
    if (!sample) {
      return false;
    }

    if (/[áéíóúñ¿¡]/.test(sample)) {
      return true;
    }

    var spanishCount = countMatches(
      sample,
      /\b(el|la|los|las|de|del|para|con|y|que|una|un|cada|consultorio|pediatría|pediátrica|citas|contacto|recursos)\b/g
    );
    var englishCount = countMatches(
      sample,
      /\b(the|and|for|with|to|is|are|of|in|clinic|appointments|contact|resources)\b/g
    );
    return spanishCount > 0 && spanishCount >= englishCount;
  }

  function isLikelyEnglish(value) {
    var sample = normalizeDictionaryKey(value).toLowerCase();
    if (!sample) {
      return false;
    }

    var englishCount = countMatches(
      sample,
      /\b(the|and|for|with|to|is|are|of|in|clinic|appointments|contact|resources|health|care|request)\b/g
    );
    var spanishCount = countMatches(
      sample,
      /\b(el|la|los|las|de|del|para|con|y|que|una|un|cada|consultorio|pediatría|pediátrica|citas|contacto|recursos)\b/g
    );
    return englishCount > 0 && englishCount > spanishCount;
  }

  Object.keys(externalDictRaw).forEach(function (key) {
    var normalizedKey = normalizeDictionaryKey(key);
    if (!normalizedKey) {
      return;
    }
    var value = String(externalDictRaw[key] || "").trim();
    externalDict[normalizedKey] = value;
    var loweredKey = normalizedKey.toLowerCase();
    if (!externalDictLower[loweredKey]) {
      externalDictLower[loweredKey] = value;
    }
  });

  Object.keys(externalDict).forEach(function (key) {
    var englishValue = normalizeDictionaryKey(externalDict[key]);
    if (!englishValue) {
      return;
    }
    if (englishValue.toLowerCase() === key.toLowerCase()) {
      return;
    }
    if (!reverseExternalDict[englishValue]) {
      reverseExternalDict[englishValue] = key;
    }
    var loweredEnglishValue = englishValue.toLowerCase();
    if (!reverseExternalDictLower[loweredEnglishValue]) {
      reverseExternalDictLower[loweredEnglishValue] = key;
    }
  });

  Object.keys(WORD_MAP).forEach(function (spanishWord) {
    var englishWord = String(WORD_MAP[spanishWord] || "").trim().toLowerCase();
    if (!englishWord || englishWord.indexOf(" ") !== -1) {
      return;
    }
    if (!/^[a-z]+$/i.test(englishWord)) {
      return;
    }
    if (AMBIGUOUS_ENGLISH_WORDS[englishWord]) {
      return;
    }
    if (!reverseWordMap[englishWord]) {
      reverseWordMap[englishWord] = spanishWord;
    }
  });

  function normalizeLanguage(value) {
    var lang = String(value || "").trim().toLowerCase();
    if (!SUPPORTED_LANGS[lang]) {
      return DEFAULT_LANG;
    }
    return lang;
  }

  var currentLang = normalizeLanguage(getStoredLang() || DEFAULT_LANG);

  function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function phraseRegex(source) {
    var escaped = escapeRegex(source);
    if (/^[A-Za-z0-9 ]+$/.test(source)) {
      return new RegExp("\\b" + escaped.replace(/\s+/g, "\\s+") + "\\b", "g");
    }
    return new RegExp(escaped, "g");
  }

  function preserveCase(source, target) {
    if (!source) {
      return target;
    }
    if (source === source.toUpperCase()) {
      return target.toUpperCase();
    }
    if (source.charAt(0) === source.charAt(0).toUpperCase()) {
      return target.charAt(0).toUpperCase() + target.slice(1);
    }
    return target;
  }

  function translateWordToken(token) {
    var key = token.toLowerCase();
    var mapped = WORD_MAP[key];
    if (!mapped) {
      return token;
    }
    return preserveCase(token, mapped);
  }

  function translateSpanishToEnglish(text) {
    if (typeof text !== "string") {
      return text;
    }

    if (!text.trim()) {
      return text;
    }

    if (/^[\d\s().+\-/:|]+$/.test(text)) {
      return text;
    }

    if (/https?:\/\//i.test(text) || /^mailto:/i.test(text) || /^tel:/i.test(text)) {
      return text;
    }

    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim())) {
      return text;
    }

    var leading = (text.match(/^\s*/) || [""])[0];
    var trailing = (text.match(/\s*$/) || [""])[0];
    var core = text.trim();
    var normalizedCore = normalizeDictionaryKey(core);
    var exactMatch = externalDict[normalizedCore] || externalDictLower[normalizedCore.toLowerCase()];
    if (exactMatch) {
      return leading + exactMatch + trailing;
    }

    var out = text;

    PHRASE_MAP.forEach(function (pair) {
      var source = pair[0];
      var target = pair[1];
      if (!source || source === target) {
        return;
      }
      var re = phraseRegex(source);
      out = out.replace(re, target);
    });

    out = out.replace(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/g, function (token) {
      return translateWordToken(token);
    });

    out = out
      .replace(/\bof the of\b/gi, "of the")
      .replace(/\bthe the\b/gi, "the")
      .replace(/\bto the the\b/gi, "to the")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+([,.;:!?])/g, "$1");

    return out;
  }

  function translateEnglishWordToken(token) {
    var key = token.toLowerCase();
    if (key === "a") {
      return preserveCase(token, "a");
    }
    var mapped = reverseWordMap[key];
    if (!mapped) {
      return token;
    }
    return preserveCase(token, mapped);
  }

  function translateEnglishToSpanish(text) {
    if (typeof text !== "string") {
      return text;
    }

    if (!text.trim()) {
      return text;
    }

    if (/^[\d\s().+\-/:|]+$/.test(text)) {
      return text;
    }

    if (/https?:\/\//i.test(text) || /^mailto:/i.test(text) || /^tel:/i.test(text)) {
      return text;
    }

    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim())) {
      return text;
    }

    var leading = (text.match(/^\s*/) || [""])[0];
    var trailing = (text.match(/\s*$/) || [""])[0];
    var core = text.trim();
    var normalizedCore = normalizeDictionaryKey(core);
    var exactMatch = reverseExternalDict[normalizedCore] || reverseExternalDictLower[normalizedCore.toLowerCase()];
    if (exactMatch) {
      return leading + exactMatch + trailing;
    }

    if (isLikelySpanish(core) && !isLikelyEnglish(core)) {
      return text;
    }

    var out = text;

    PHRASE_MAP.forEach(function (pair) {
      var source = pair[1];
      var target = pair[0];
      if (!source || source === target) {
        return;
      }
      var re = phraseRegex(source);
      out = out.replace(re, target);
    });

    out = out.replace(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/g, function (token) {
      return translateEnglishWordToken(token);
    });

    out = out
      .replace(/\bde de\b/gi, "de")
      .replace(/\bel el\b/gi, "el")
      .replace(/\bla la\b/gi, "la")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+([,.;:!?])/g, "$1");

    return out;
  }

  function translateForLanguage(text, lang) {
    if (lang === "en") {
      return translateSpanishToEnglish(text);
    }
    return translateEnglishToSpanish(text);
  }

  function getCurrentLanguage() {
    return currentLang;
  }

  function notifyLanguageChange(lang) {
    listeners.forEach(function (listener) {
      try {
        listener(lang);
      } catch (error) {
        // no-op
      }
    });
  }

  function onLanguageChange(listener) {
    if (typeof listener !== "function") {
      return function () {};
    }
    listeners.push(listener);
    return function () {
      listeners = listeners.filter(function (item) {
        return item !== listener;
      });
    };
  }

  function getAttributeSourceBag(node) {
    var bag = attrSourceMap.get(node);
    if (!bag) {
      bag = {};
      attrSourceMap.set(node, bag);
    }
    return bag;
  }

  function shouldSkipElement(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }
    var tag = node.tagName;
    if (!tag) {
      return false;
    }
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "CODE" || tag === "PRE") {
      return true;
    }
    if (node.closest("[data-no-translate='true']")) {
      return true;
    }
    return false;
  }

  function translateAttribute(node, attrName) {
    if (!node || !node.hasAttribute || !node.hasAttribute(attrName)) {
      return;
    }

    var currentValue = node.getAttribute(attrName);
    if (currentValue == null || !String(currentValue).trim()) {
      return;
    }

    var bag = getAttributeSourceBag(node);
    if (!Object.prototype.hasOwnProperty.call(bag, attrName)) {
      bag[attrName] = currentValue;
    } else if (currentLang === "en" && currentValue !== translateSpanishToEnglish(bag[attrName]) && isLikelySpanish(currentValue)) {
      bag[attrName] = currentValue;
    }

    var sourceValue = bag[attrName];
    var translatedSource = translateForLanguage(sourceValue, currentLang);
    if (!applying && currentValue !== sourceValue && currentValue !== translatedSource) {
      bag[attrName] = currentValue;
      sourceValue = currentValue;
    }
    var targetValue = translateForLanguage(sourceValue, currentLang);

    if (currentValue !== targetValue) {
      node.setAttribute(attrName, targetValue);
    }
  }

  function translateTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) {
      return;
    }

    var raw = node.textContent;
    if (!raw || !raw.trim()) {
      return;
    }

    var parent = node.parentElement;
    if (shouldSkipElement(parent)) {
      return;
    }

    if (!textSourceMap.has(node)) {
      textSourceMap.set(node, raw);
    } else {
      var sourceCandidate = textSourceMap.get(node);
      var translatedCandidate = translateForLanguage(sourceCandidate, currentLang);
      if (!applying && raw !== translatedCandidate && raw !== sourceCandidate) {
        textSourceMap.set(node, raw);
      }
    }

    var source = textSourceMap.get(node);
    var target = translateForLanguage(source, currentLang);

    if (node.textContent !== target) {
      node.textContent = target;
    }
  }

  function translateNodeTree(root) {
    if (!root) {
      return;
    }

    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root);
      return;
    }

    if (root.nodeType !== Node.ELEMENT_NODE && root !== document) {
      return;
    }

    var base = root === document ? document.documentElement : root;
    if (!base) {
      return;
    }

    if (base.nodeType === Node.ELEMENT_NODE && shouldSkipElement(base)) {
      return;
    }

    if (base.nodeType === Node.ELEMENT_NODE) {
      ["placeholder", "title", "aria-label", "alt"].forEach(function (attrName) {
        translateAttribute(base, attrName);
      });
    }

    var textWalker = document.createTreeWalker(base, NodeFilter.SHOW_TEXT, null);
    var textNodes = [];
    while (textWalker.nextNode()) {
      textNodes.push(textWalker.currentNode);
    }
    textNodes.forEach(translateTextNode);

    var elementWalker = document.createTreeWalker(base, NodeFilter.SHOW_ELEMENT, null);
    var elements = [];
    while (elementWalker.nextNode()) {
      elements.push(elementWalker.currentNode);
    }

    elements.forEach(function (el) {
      if (shouldSkipElement(el)) {
        return;
      }
      ["placeholder", "title", "aria-label", "alt"].forEach(function (attrName) {
        translateAttribute(el, attrName);
      });

      if (el.tagName === "META" && el.hasAttribute("content")) {
        translateAttribute(el, "content");
      }
    });

    if (document && document.title) {
      var titleBag = getAttributeSourceBag(document.documentElement);
      if (!titleBag.documentTitle) {
        titleBag.documentTitle = document.title;
      }
      document.title = translateForLanguage(titleBag.documentTitle, currentLang);
    }

    document.documentElement.setAttribute("lang", currentLang);
  }

  function applyLanguage(root) {
    if (applying) {
      return;
    }
    applying = true;
    try {
      translateNodeTree(root || document.body || document.documentElement);
    } finally {
      applying = false;
    }
  }

  function scheduleApply(root) {
    if (pending) {
      return;
    }
    pending = true;
    window.requestAnimationFrame(function () {
      pending = false;
      applyLanguage(root || document.body || document.documentElement);
    });
  }

  function setLanguage(language, options) {
    var lang = normalizeLanguage(language);
    currentLang = lang;

    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch (error) {
      // no-op
    }

    scheduleApply(document.body || document.documentElement);

    if (!options || !options.silent) {
      notifyLanguageChange(lang);
    }

    return currentLang;
  }

  var observer = new MutationObserver(function (mutations) {
    var roots = [];
    mutations.forEach(function (mutation) {
      if (mutation.type === "characterData" && mutation.target) {
        roots.push(mutation.target);
      }
      if (mutation.type === "childList") {
        if (mutation.target) {
          roots.push(mutation.target);
        }
        mutation.addedNodes.forEach(function (node) {
          roots.push(node);
        });
      }
      if (mutation.type === "attributes" && mutation.target) {
        roots.push(mutation.target);
      }
    });
    if (!roots.length) {
      return;
    }
    scheduleApply(document.body || document.documentElement);
  });

  function startObserver() {
    var target = document.documentElement || document.body;
    if (!target) {
      return;
    }
    observer.observe(target, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "title", "aria-label", "alt", "content"]
    });
  }

  window.DR_KATHERINE_I18N = {
    getLanguage: getCurrentLanguage,
    setLanguage: setLanguage,
    onLanguageChange: onLanguageChange,
    translateText: function (text, targetLang) {
      return translateForLanguage(text, normalizeLanguage(targetLang || currentLang));
    },
    refresh: function () {
      scheduleApply(document.body || document.documentElement);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      startObserver();
      setLanguage(currentLang, { silent: true });
      scheduleApply(document.body || document.documentElement);
    });
  } else {
    startObserver();
    setLanguage(currentLang, { silent: true });
    scheduleApply(document.body || document.documentElement);
  }
})();
