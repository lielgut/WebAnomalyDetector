var selectedModelID;
var modelType;
var loadedTrainFile;
var loadedDetectFile;
var loadedDetectData = {};
var anomalyData = {};
var selectedFeature;

// Check if the browser supports drag&drop ///////////////
var supportsDragnDrop = function () {
    var div = document.createElement('div');
    return (('draggable' in div) || ('ondragstart' in div && 'ondrop' in div)) && 'FormData' in window && 'FileReader' in window;
}();

if (supportsDragnDrop) {
    // dropArea animation when refreshing the page.
    $('.dropArea').addClass('dropAreaRefreshAnimation');
}
else {
    alert("Please enable JavaScript.");
}
/////////////////////////////////////////////////////////

function removeModel(id) {
    if (selectedModelID == id) {
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

function createTable() {
    let attrs = Object.keys(loadedDetectData);
    if (attrs.length == 0) {
        return;
    }
    let headers = $("#TableHeaders");
    let rows = $("#TableRows");
    let numRows = loadedDetectData[attrs[0]].length;
    // adds the attribute names as columns
    let s = "";
    attrs.forEach(attr => {
        s += "<th>" + attr + "</th>\n";
    });
    headers.html(s);

    s = "";
    for (let i = 0; i < numRows; i++) {
        s = s + "<tr id=\"row" + i + "\">\n"
        attrs.forEach(attr => {
            let attrData = loadedDetectData[attr];
            s += "<td id=\"" + attr + i + "\">" + attrData[i] + "</td>\n";
        });
        s += "</tr>\n";
    }
    $("#TableRows").html(s);
};

function updateSelections() {
    let s = "";
    let attrs = Object.keys(loadedDetectData);
    attrs.forEach(attr => {
        s += "<option id=\"select-" + attr + "\" value=\"" + attr + "\">" + attr + "</option>\n";
    });
    $("#featuresSelect").html(s);
}

function updateAnomalies() {
    let s = "";
    if (selectedFeature != undefined) {
        anomalyData.anomalies[selectedFeature].forEach(range => {
            s += "<tr><td>" + range[0] + "</td><td>" + range[1] + "</td></tr>\n";
        });
    }
    $("#anomaliesRows").html(s);
    Object.keys(anomalyData.anomalies).forEach(key => {
        let corrAttr = anomalyData.reason[key];
        if (anomalyData.anomalies[key].length > 0)
            $("#select-" + key).css("background-color", "#dc3545");
        anomalyData.anomalies[key].forEach(range => {
            for (let i = range[0]; i <= range[1]; i++) {
                $("#" + key + i).css("background-color", "#dc3545");
                $("#" + corrAttr + i).css("background-color", "#dc3545");

            }
        })
    })
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
    if (modelType == undefined) {
        alert("no model type selected. Please choose one.");
        return;
    }
    if (loadedTrainFile == undefined) {
        alert("no file loaded. Please upload a CSV file.");
        return;
    }
    let loadedTrainData = {};
    readFile(loadedTrainFile, loadedTrainData).then(() => {

        let body = { train_data: loadedTrainData };

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
                        if (data.status == 'ready') {
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
    $("#trainFileLabel").html("<strong>Choose a train file</strong><span> or drag it here.</span></label>")
});

$("#detectBtn").click(() => {

    if (selectedModelID == undefined) {
        alert("no models loaded. Please upload a train file.");
        return;
    }
    if ($("#status" + selectedModelID).html() == "pending") {
        alert("selected model is pending. Please wait for it to be ready.");
        return;
    }
    loadedDetectData = {};
    readFile(loadedDetectFile, loadedDetectData).then(() => {

        let body = { predict_data: loadedDetectData };

        selectedFeature = Object.keys(loadedDetectData)[0];
        updateSelections();
        $("#featuresSelect").val(selectedFeature);
        createTable();

        $.ajax({
            url: '/api/anomaly?model_id=' + selectedModelID,
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            success: (data) => {
                anomalyData = data;
                updateAnomalies();
                alert("recieved anomaly report.");
            },
            error: () => {
                alert("error in uploading detect file.");
            },
            data: JSON.stringify(body)
        });
    });
    $("#detectFileLabel").html("<strong>Choose a detect file</strong><span> or drag it here.</span></label>")
});

$("#featuresSelect").change(() => {
    selectedFeature = $("#featuresSelect").get(0).value;
    updateAnomalies();
});

$("#trainFileInput").change((event) => {
    loadedTrainFile = event.target.files[0];
    // change label to show file name
    $("#trainFileLabel").text(loadedTrainFile.name);
});

$("#detectFileInput").change((event) => {
    loadedDetectFile = event.target.files[0];
    // change label to show file name
    $("#detectFileLabel").text(loadedDetectFile.name);
});

// fileBox for train dropArea
$("#trainDropArea").on('dragover', (event) => {
    // prevent any unwanted behaviors for the assigned events across browsers.
    event.stopPropagation();
    event.preventDefault();
    // Style the drag-and-drop as a "copy file" operation.
    event.originalEvent.dataTransfer.dropEffect = 'copy';
}).on('dragover dragenter', event => {
    $("#trainDropArea").addClass('is-dragover');
}).on('dragleave dragend drop', () => {
    $("#trainDropArea").removeClass('is-dragover');
}).on('drop', (event) => {
    event.stopPropagation();
    event.preventDefault();
    let file = event.originalEvent.dataTransfer.files[0];
    let fileName = file.name.split(".");
    // check if file is a csv file
    if (fileName[fileName.length - 1] == "csv") {
        loadedTrainFile = file;
        // change label to show file name
        $("#trainFileLabel").text(file.name);
    }
    else {
        alert("Only CSV files are allowed.");
    }
});

// fileBox for detect dropArea
$("#detectDropArea").on('dragover', (event) => {
    event.stopPropagation();
    event.preventDefault();
    // Style the drag-and-drop as a "copy file" operation.
    event.originalEvent.dataTransfer.dropEffect = 'copy';
}).on('dragover dragenter', () => {
    $("#detectDropArea").addClass('is-dragover');
}).on('dragleave dragend drop', () => {
    $("#detectDropArea").removeClass('is-dragover');
}).on('drop', (event) => {
    event.stopPropagation();
    event.preventDefault();
    let file = event.originalEvent.dataTransfer.files[0];
    let fileName = file.name.split(".");
    // check if file is a csv file
    if (fileName[fileName.length - 1] == "csv") {
        loadedDetectFile = file;
        // change label to show file name
        $("#detectFileLabel").text(file.name);
    }
    else {
        alert("Only CSV files are allowed.");
    }
});

$.getJSON("/api/models", data => {
    data.forEach(model => { addModel(model); });
});