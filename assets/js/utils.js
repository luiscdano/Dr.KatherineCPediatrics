(function () {
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

  window.DR_KATHERINE_UTILS = {
    getBasePath: getBasePath,
    localUrl: localUrl
  };
})();
