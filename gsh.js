// Include the google-spreadsheet library 
const {GoogleSpreadsheet} = require('google-spreadsheet')
const creds = require('../repis1-65e0fb16c588.json')
const SPREADSHEET_ID = '1jHZKrRUEW01c7QOQAP7MJB65_-uLGARNUPf0EwHzb3A'

// Create a reference to the spreadsheet
const doc = new GoogleSpreadsheet(SPREADSHEET_ID)

const accessSheet = async () => {
    await doc.useServiceAccountAuth(creds)
    await doc.loadInfo()
    const worksheet = doc.sheetsByIndex[1]
    const rows = await worksheet.getRows()
    rows.forEach((row) => {
      console.log(row.kaader, row.perenimi)
    })


    // watch the spreadsheet for updates
    doc.getInfo().then((info) => {
        console.log(info)
        // get sheet by its title
        const sheet = info.worksheets[0];
     
        // watch the given range
        sheet.watchRange('A1:B10', (err, row, column) => {
     
          if (err) {
            console.log(err);
          }
     
          // log out any updates
          console.log('Updates detected in range A1:B10, data was: ', row, column);
        });
    });


}

accessSheet()

