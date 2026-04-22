class IntentStrategy {
  constructor(name, matcher, responder) {
    this.name = name;
    this.matcher = matcher;
    this.responder = responder;
  }

  matches(context) {
    return this.matcher(context);
  }

  getResponse(context) {
    return this.responder(context);
  }
}

module.exports = IntentStrategy;
