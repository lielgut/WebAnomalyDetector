var selectedModelID;
var modelType;
var loadedTrainFile;
var loadedDetectFile;
var loadedDetectData = {};
var anomalyData;

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
    $("#modelTableBody").append("\
    <tr id=\"tr" + id + "\">\
    <td><input type=\"radio\" id=\"" + id + "\" name=\"radiobtn\"></td>\
    <td>" + id + "</td>\
    <td id=\"status" + id + "\">" + model.status + "</td>\
    <td><button type=\"button\" id=\"delete" + id + "\" class=\"btn btn-sm btn-danger\">X</button></td>\
    </tr>\
    ");
    $("#" + id).click(() => {
        selectedModelID = id;
    });
    $("#" + id).click();
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
    if(loadedTrainFile == undefined) {
        alert("no file loaded. Please upload a CSV file.");
        return;
    }
    let loadedTrainData = {};
    readFile(loadedTrainFile, loadedTrainData).then(() => {

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
        }, 3000);
            },
            error: () => {
                alert("error in uploading model");
            },
            data: JSON.stringify(body)
        });
    });
});

$("#detectBtn").click(() => {
    
    if(selectedModelID == undefined) {
        alert("no models loaded. Please upload a train file.");
        return;
    }
    if($("#status" + selectedModelID).html() == "pending") {
        alert("selected model is pending. Please wait for it to be ready.");
        return;
    }

    loadedDetectData = {};
    readFile(loadedDetectFile, loadedDetectData).then(() => {

        let body = {predict_data: loadedDetectData};

        $.ajax({
            url: '/api/anomaly?model_id=' + selectedModelID,
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            success: (data) => {
                anomalyData = data;
                alert("recieved anomaly report.");
            },
            error: () => {
                alert("error in uploading detect file.");
            },
            data: JSON.stringify(body)
        });
    });
});

$("#trainFileInput").change((event) => {
    loadedTrainFile = event.target.files[0];
});

$("#detectFileInput").change((event) => {
    loadedDetectFile = event.target.files[0];
});

$("#trainDropArea").on('dragover', (event) => {
    $("#trainDropArea").css("background-color","gray");
    event.stopPropagation();
    event.preventDefault();
    // Style the drag-and-drop as a "copy file" operation.
    event.originalEvent.dataTransfer.dropEffect = 'copy';
});

$("#trainDropArea").on('drop', (event) => {
    $("#trainDropArea").css("background-color","");
    event.stopPropagation();
    event.preventDefault();
    let file = event.originalEvent.dataTransfer.files[0];
    let fileName = file.name.split(".");
    // check if file is a csv file
    if (fileName[fileName.length - 1] == "csv") {
        loadedTrainFile = file;
    }
    else {
        alert("Only CSV files are allowed.");
    }
});

$("#detectDropArea").on('dragover', (event) => {
    $("#detectDropArea").css("background-color","gray");
    event.stopPropagation();
    event.preventDefault();
    // Style the drag-and-drop as a "copy file" operation.
    event.originalEvent.dataTransfer.dropEffect = 'copy';
});

$("#detectDropArea").on('drop', (event) => {
    event.stopPropagation();
    event.preventDefault();
    let file = event.originalEvent.dataTransfer.files[0];
    let fileName = file.name.split(".");
    // check if file is a csv file
    if (fileName[fileName.length - 1] == "csv") {
        loadedDetectFile = file;
    }
    else {
        alert("Only CSV files are allowed.");
    }
});

$.getJSON("/api/models", data => {
    data.forEach(model => { addModel(model); });
  });