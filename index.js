var selectedModelID;
$.getJSON("/api/models", data => {
    for(var i=0; i<data.length; i++) {
        let model = data[i];
        let id = model.model_id;
        $("#modelTable").append("\
        <tr id=\"div" + id + "\">\
        <td><input type=\"radio\" id=\"" + id + "\" name=\"radiobtn\"></td>\
        <td>" + id + "</td>\
        <td>" + model.status + "</td>\
        <td><button type=\"button\">X</button></td>\
        </tr>\
        ");
        $("#" + id).click(() => {
            selectedModelID = id;
        });
    }
  });