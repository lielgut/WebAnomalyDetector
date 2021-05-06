var selectedModelID;
var modelType;
var loadedFile;
var loadedTrainData = {};
var loadedDetectData = {};

function removeModel(id) {  
    if(selectedModelID == id) {
        selectedModelID = undefined;  
    }
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

async function readFile(file, loadedData) {
    let text = await file.text();
    let data = text.split(/\r\n|\r|\n/);
    let features = data[0].split(",");
    // add features keys to the dictionary with arrays as values.
    features.forEach((attr, i) => {
        if (attr in loadedData)
            attr = features[i] += "2";
        loadedData[attr] = [];
    });
    // add all of the data to the correct feature.
    for (let i = 1; i < data.length; i++) {
        let line = data[i].split(",");
        if (line.length > 1) {
            for (let j = 0; j < line.length; j++) {
                loadedData[features[j]].push(parseFloat(line[j]));
            }
        }
    }
};

$("#regSelect").click(() => {
    modelType = 'regression';
});

$("#hybridSelect").click(() => {
    modelType = 'hybrid';
});

$("#trainBtn").click(() => {
    if(modelType == undefined) {
        alert("no model type selected. Please choose one.");
        return; 
    }
    if(loadedFile == undefined) {
        alert("no file loaded. Please upload a CSV file.");
        return;
    }
    loadedTrainData = {};
    readFile(loadedFile, loadedTrainData).then(() => {

        let body = {train_data: loadedTrainData};

        $.ajax({
            url: '/api/model?model_type=' + modelType,
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            success: (model) => {
                
                addModel(model);
                alert("model uploaded succesfully");

                let interval;
                interval = setInterval(() => {
                $.getJSON("/api/model?model_id=" + model.model_id, data => {
                if(data.status == 'ready') {
                    clearInterval(interval);
                    $("#status" + data.model_id).html("ready");
                }
                });
        }, 5000);
            },
            error: () => {
                alert("error in uploading model");
            },
            data: JSON.stringify(body)
        });
    });
});

// gives us a larger drop area
$("#trainDropArea").on('dragover', (event) => {
    $("#trainDropArea").css("background-color","gray");
    event.stopPropagation();
    event.preventDefault();
    // Style the drag-and-drop as a "copy file" operation.
    event.originalEvent.dataTransfer.dropEffect = 'copy';
});


$("#trainDropArea").on('drop', (event) => {
    event.stopPropagation();
    event.preventDefault();
    let file = event.originalEvent.dataTransfer.files[0];
    let fileName = file.name.split(".");
    // check if file is a csv file
    if (fileName[fileName.length - 1] == "csv") {
        loadedFile = file;
    }
    else {
        alert("Only CSV files are allowed.");
    }
});

$.getJSON("/api/models", data => {
    data.forEach(model => { addModel(model); });
  });