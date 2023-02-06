const credentials = require('../repis1-65e0fb16c588.json')
const SPREADSHEET_ID = '1jHZKrRUEW01c7QOQAP7MJB65_-uLGARNUPf0EwHzb3A'

const { google } = require('googleapis');

const sheets = google.sheets({ version: 'v4', auth: credentials });

// get the spreadsheet id from the spreadsheet url
const spreadsheetId = SPREADSHEET_ID

// define the range
const range = 'A1:B10';

// get the current values in the range
sheets.spreadsheets.values.get({
  spreadsheetId,
  range,
}, (err, res) => {
  if (err) return console.log('The API returned an error: ' + err);
  const rows = res.data.values;
  if (rows.length) {
    console.log('Current values in the range:');
    rows.map((row) => {
      console.log(`${row[0]}, ${row[1]}`);
    });
  } else {
    console.log('No data found.');
  }
});

// watch the range for changes
sheets.spreadsheets.values.watch({
  spreadsheetId,
  range,
  resource: {
    valueInputOption: 'RAW',
    data: {
      // value range to watch
      "range": range,
      // how to handle updates
      "majorDimension": "ROWS",
    }
  }
}, (err, res) => {
  if (err) return console.log('The API returned an error: ' + err);
  console.log(`Watching for changes in range: ${range}`);
});

// listen for updates on the channel
sheets.spreadsheets.values.get({
  spreadsheetId,
  range,
}, (err, res) => {
  if (err) return console.log('The API returned an error: ' + err);
  const channelId = res.data.updates.channelId;
  const channelExpiration = res.data.updates.channelExpiration;
  const request = {
    spreadsheetId,
    resource: {
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING',
    },
    auth: credentials,
  };

  // get the updates
  sheets.spreadsheets.values.getUpdates(request, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const updatedValues = res.data.updatedData.values;
    if (updatedValues.length) {
      console.log('Updated values in the range:');
      updatedValues.map((row) => {
        console.log(`${row[0]}, ${row[1]}`);
      });
    } else {
      console.log('No updates found.');
    }
  });
});