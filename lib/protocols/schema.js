// the schema defining the protocols schema (returned from
// <protocol_name>/protocol.js, which must list the verbs and platforms
// supported, with schemas for the verbs./
module.exports = {
  "verbs" : {
    "title": "verbs",
    "type": "object",
    "properties": {
      "": {
        "type": "object",
        "required" : false,
        "properties" : {
          "name" : {
            "title" : "name",
            "type": "string",
            "required": true
          },
          "schema" : {
            "title" : "schema",
            "type": "object",
            "required": true
          }
        }
      }
    }
  },

  "platforms" : {
    "title": "platforms",
    "type": "object",
    "properties": {
      "": {
        "type": "object",
        "required": false,
        "properties": {
          "name": {
            "type": "string",
            "required" : true
          },
          "verbs": {
            "type": "object",
            "required" : true
          }
        }
      }
    }
  }
};