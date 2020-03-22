var Interfake = require('interfake');
var interfake = new Interfake();
var req = interfake.post('/account/api/')
    .status(200).body({ apikey: '1234-1234-1234-1234' });
    // .status(401).body({ })
interfake.post('/api/authorize')
    .status(202).body({"links": {"self":"http://localhost:3000/api/get/abbc7c94-h11y-4r27-92fg-czd3362f464a","upload": "http://localhost:3000/api/upload/abcd_very_long_example"}})
    // .status(400).body({'error': 'invalid_request'});
    // .status(402).body({'error': 'payment_required'});
    // .status(403).body({'error': 'auth_failed'});
    // .status(406).body({'error': 'value_error'});
    // .status(429).body({'error': 'too_many_requests'});
interfake.post('/api/upload/abcd_very_long_example')
    .status(202).body({});
    // .status(400).body({ "error": "invalid_request" });
interfake.get('/api/get/abbc7c94-h11y-4r27-92fg-czd3362f464a')
    // .status(200).body({ 'status': 'waiting' })
    .status(200).body({ 'status': 'processing' })
    // .status(200).body({ 'status': 'failed' })
    // .status(200).body({ 'status': 'failed', 'error': 'processing_failed' })
    // .status(400).body({})
    // .status(200).body({ 'status': 'finished', 'links': { 'download': 'http://localhost:3000/safe-document.pdf' } })

interfake.get('/safe-document.pdf')
    .status(200).body({})
    // .status(400).body({})

interfake.listen(3000);