## Twilio Translator

A Twilio service that translates back an SMS message. 
It also calls you back with a pronunciation in the local language. 
Useful if you're traveling - especially in occasions where your telco signal 
is a better option than wifi. 
Uses node.js and [Mashape](http://mashape.com/) APIs (language detection, language translation, and text-to-voice)

### Try the service

Send an SMS message to +1 (415) 992-9984, "Take me to the bar ES".  The "ES" stands for Spanish.  You can try other languages such as "DE", "IT", etc.
You can also try a non-English message like "Hola mundo en".  Watch the video demo [here](http://www.youtube.com/watch?v=wiBuc87dcFU). 

### Tutorial and config.js 

You can (temporarily) find the tutorial explaining the basic components of the code [here](http://jsfiddle.net/ismaelc/J7B84/embedded/result/).
To configure the service, you need to copy `config-sample.js` to `config.js` with the required values:

    config.twilio = {};
    config.twilio.sid = 'abc';
    config.twilio.token = 'xyz';
    config.twilio.number = '+1234567890';

    config.mashape = {};
    config.mashape.key = '<Get your key from https://www.mashape.com/keys>';

    config.app = {};
    config.app.url = 'http://yourapp.nodejitsu.com/';

