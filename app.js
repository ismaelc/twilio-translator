var express = require('express'),
    routes = require('./routes');

var app = express();

app.configure(function () {
   app.use(express.logger('dev'));
   app.use(express.bodyParser());
});

app.post('/receiveSMS', routes.receiveSMS);
app.post('/makeCall', routes.makeCall);
app.post('/getTwimlToCall', routes.getTwimlToCall);
app.get('/getTwimlToCall', routes.getTwimlToCall);

app.listen(process.env.PORT || 3000);
console.log('Listening on post ' + process.env.PORT + '...'); 
