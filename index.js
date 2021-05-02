$.getJSON("/api/models", data => {
    console.log(data);
    for(var i=0; i<data.length; i++) {
        let model = data[i];
        $(".Model").append("<h3 class=\"model" + model.model_id + "\">" + model.model_id + ", " + model.status + "</h3>");
    }
  });