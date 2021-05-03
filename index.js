var selectedModelID;

function removeModel(id) {    
    $.ajax({
        url: '/api/model?model_id=' + id,
        type: 'DELETE',
        success: () => {
            $("#tr" + id).remove();
            alert("model " + id + " deleted succesfuly.");
        },
        error: () => {
            alert("error in deleting model");
        }
    });
}

function addModel(model) {
    let id = model.model_id;
        $("#modelTable").append("\
        <tr id=\"tr" + id + "\">\
        <td><input type=\"radio\" id=\"" + id + "\" name=\"radiobtn\"></td>\
        <td>" + id + "</td>\
        <td id=\"status" + id + "\">" + model.status + "</td>\
        <td><button type=\"button\" id=\"delete" + id + "\">X</button></td>\
        </tr>\
        ");
        $("#" + id).click(() => {
            selectedModelID = id;
        });
        $("#delete" + id).click(() => {
             removeModel(id); 
        });
}

$.getJSON("/api/models", data => {
    for(var i=0; i<data.length; i++) {
        addModel(data[i]);
    }
  });

$("#trainBtn").click(() => {
    // load data from csv file
    let data;
    let body = {train_data: data};
    $.post("/api/model",body,(response, status) => {
        // TODO check status
        addModel(response);
    },"json");

    let interval;
    interval = setInterval(() => {
        $.getJSON("/api/model", data => {
            if(data.status == 'ready') {
                clearInterval(interval);
                $("#status" + data.model_id).html("ready");
            }
          });
    }, 5000);
});