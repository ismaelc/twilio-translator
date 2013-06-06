
var request = require('request'),
   qs = require('querystring'),
   https = require('https'),
   config = require('../config');

var langArray = [
   'ar', 'km', 'zh', 'hr', 'cs', 'da', 'nl', 'en', 'et',
   'fi', 'fr', 'de', 'el', 'hi', 'hu', 'id', 'it', 'ja',
   'ko', 'la', 'ms', 'ne', 'fa', 'pl', 'pt', 'ro', 'ru',
   'es', 'sv', 'tl', 'ta', 'th', 'tr', 'uk', 'vi'
];

// Receives the SMS message, calls the translation API
exports.receiveSMS = function (req, res) {
   //TODO: Check if call is coming from Twilio
   var message = req.body.Body;
   var from = req.body.From;
   var to = req.body.To;

   // Get language code at the end of the message
   var msgArr = message.split(' ');
   var lang = msgArr.pop().toLowerCase();
   message = msgArr.join(' ');

   // Flag if language is on the list or not
   var langInArr = false;
   for (var i = 0; i < langArray.length; i++) {
      if (lang == langArray[i]) {
         langInArr = true;
      }
   }

   // Send an SMS back to user if language code is not recognized
   if (!langInArr) {
      sendTwiml(res, "At the end of your message, please add a 2-letter code of your target language");
      return false;
   }

   if (message) {
      // Call the language detection API
      request({
            url: 'https://langdetect.p.mashape.com/language?text=' + message + '&mode=json',
            method: 'GET',
            headers: {
               'Content-Type': 'application/json',
               'X-Mashape-Authorization': config.mashape.key
            }
         }, function (err, resp, bod) {
            // Send an SMS back to user if language detection is unsuccessful
            if (err) {
               console.log("Error contacting language detect API");
               sendTwiml(res, "Error in translation");
            } else {
               var resultObj = JSON.parse(bod);
               var perceivedLang = resultObj.lang;

               // Default detected language to EN if language not detected, yeah I know
               if (!perceivedLang || perceivedLang == '') perceivedLang = 'en';

               // Call the language translation API
               try { // to catch non-JSON text response from translation API (tends to happen if language is not supported)
                  request({
                        url: 'https://translated-mymemory---translation-memory.p.mashape.com/api/get?langpair=' + perceivedLang + '|' + lang + '&q=' + message + '&mt=1&of=json&v=1',
                        method: 'GET',
                        headers: {
                           'Content-Type': 'application/json',
                           'X-Mashape-Authorization': config.mashape.key
                        }
                     }, function (err2, resp2, bod2) {
                        if (err2) {
                           console.log("Error contacting language translation API");
                           sendTwiml(res, "Error in translation");
                        } else {

                           var resultObj2 = JSON.parse(bod2);
                           var translatedText = resultObj2.responseData.translatedText;

                           // Prepare translated text to be SMS'd to user
                           if (translatedText != '') {

                              // This is a separate request to make the call, passing the translated text needed for the text to voice API
                              request({
                                    url: config.app.url + 'makeCall?t=' + encodeURIComponent(translatedText) + '&to=' + from + '&lang=' + lang,
                                    method: 'POST',
                                 }, function (err3, resp3, bod3) {
                                    if (err3) {
                                       console.log("Error calling makeCall: " + err3);
                                    }
                                    // Send SMS regardless if call is successful or not                                    
                                    sendTwiml(res, translatedText);
                                    return false;
                                 })
                           } else {
                              // Send SMS to user if translation is unsuccessful                                 
                              sendTwiml(res, "Empty response from translation. Language might not be supported.");
                           }
                        }
                     });
                  // Sometimes the translation API will return an empty non-JSON response
               } catch (err) {
                  sendTwiml(res, err);
               }
            }
         });
   } else {
      sendTwiml(res, "Error empty message");
   }
}

// Builds the call request so Twilio can call the user's phone with the local voice of the translation, using a text to speech API
exports.makeCall = function (req, res) {
   // TODO: Check if function is called from same app
   var translatedText = req.query.t;
   var to = req.query.to;
   var lang = req.query.lang;

   // The parameters needed by Twilio to make the call.  The Url parameter returns a Twiml that dictates what happens when 
   // the call is picked up.  
   var postdata = qs.stringify({
         'From': config.twilio.number,
         'To': to,
         'Url': config.app.url + 'getTwimlToCall?t=' + encodeURIComponent(translatedText) + '&lang=' + lang
      });

   // Setting up the Twilio API endpoint for making calls
   var options = {
      host: 'api.twilio.com',
      path: '/2010-04-01/Accounts/' + config.twilio.sid + '/Calls.xml',
      port: 443,
      method: 'POST',
      headers: {
         'Content-Type': 'application/x-www-form-urlencoded',
         'Content-Length': postdata.length
      },
      auth: config.twilio.sid + ':' + config.twilio.token
   };

   var request = https.request(options, function (res2) {
      res2.setEncoding('utf8');
      res2.on('data', function (chunk) {
         console.log('Response: ' + chunk);
         res.send(chunk, {
               'Content-Type': 'text/xml'
            }, 200);

      })
   })

   // Make the call
   request.write(postdata);
   request.end();
}

// Returns the Twiml that instructs Twilio to play an audio file from a text to voice API
exports.getTwimlToCall = function (req, res) {
   var translatedText = req.query.t;
   var lang = req.query.lang;

   // Call the text to voice API that can handle local voices
   request({
         url: 'https://yambal-text-to-voice.p.mashape.com/url?lang=' + lang + '&text=' + translatedText,
         method: 'GET',
         headers: {
            'Content-Type': 'application/json',
            'X-Mashape-Authorization': config.mashape.key
         }
      }, function (err, resp, bod) {
         if (err) {
            console.log("Error when contacting url");
            // Play Twilio's default lady EN voice
            var twiml = '<?xml version="1.0" encoding="UTF-8" ?><Response><Say voice="woman">' + translatedText + '</Say></Response>';
            res.send(twiml, {
                  'Content-Type': 'text/xml'
               }, 200);
         } else {
            var resultObj = JSON.parse(bod);
            var audioUrl = resultObj.url;

            // Send back twiml that instructs Twilio to play audio url received from API above
            var twiml = '<?xml version="1.0" encoding="UTF-8" ?><Response><Play>' + audioUrl + '</Play></Response>';
            res.send(twiml, {
                  'Content-Type': 'text/xml'
               }, 200);
         }
      });
}

// Builds the TwiML (XML) request that this app sends back to Twilio so Twilio can SMS the 'message'

function sendTwiml(res, message) {
   var twiml = '<?xml version="1.0" encoding="UTF-8" ?><Response><Sms>' + message + '</Sms></Response>';
   res.send(twiml, {
         'Content-Type': 'text/xml'
      }, 200);
}