// based on Dr. Eliahu Khalastchi's C++ code

const fs = require('fs');

class TimeSeries {
    constructor(CSVfilename) {
        this.ts = {}
        this.atts = []

        let thisTS = this;
        let data = fs.readFileSync(CSVfilename, {encoding: 'utf8', flag:'r'});
        let i=0;

        data.split(/\r\n|\r|\n/).forEach((line) => { 
            if(line != "") {
                let splitted = line.split(",");   
            if(i==0) {
                splitted.forEach((att) => {
                    if(att in thisTS.ts) {
                        thisTS.ts[att + '2'] = [];
                        thisTS.atts.push(att + '2');
                    }
                    else {
                        thisTS.ts[att] = [];
                        thisTS.atts.push(att);
                    } 
                });   
            } 
            else {
                splitted.forEach((val, j) => {
                    thisTS.ts[thisTS.atts[j]].push(parseFloat(val));
                });
            }                
            i++;
            }
        });
        this.dataRowSize = this.ts[this.atts[0]].length;
    }

    getAttributeData(name) {
        return this.ts[name];
    }

    gettAttributes() {
		return this.atts;
	}

    getRowSize() {
        return this.dataRowSize;
    }
}

module.exports = { TimeSeries };