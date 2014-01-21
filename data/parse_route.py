import json, ijson, urllib2, httplib
import decoder, time

headers = {
	"X-Parse-Application-Id" : "viyEiYQSE5OgLQf10fhDVi6eg5YyB7bWYVcsfk0w",
	"X-Parse-REST-API-Key" : "nFaYOkFkjcNKPkIYqMTLAz4GIe2Y1g6VV35gQeJs",
	"Content-Type" : "application/json"
}

lastFrom = 536
lastTo = 2009
startPush = False

routes = ijson.items(open('route.json'), 'results.item')

batchCount = 0

for route in routes:
	if startPush == False and ( route['startID'] == lastFrom and route['endID'] == lastTo ):
		startPush = True
	elif startPush == False:
		continue

	if batchCount == 0:
		postRoutes = []

	start = str(route['startID'])
	end = str(route['endID'])
	print 'from ' + start + ' to ' + end
	overview_polyline = route['overview_polyline']
	points = decoder.decode(overview_polyline)
	# pointsStr = '|'.join(','.join(map(str, p)) for p in points)

	one = {}
	one['start'] = route['startID']
	one['end'] = route['endID']
	one['duration'] = route['duration']
	one['distance'] = route['distance']
	one['points'] = points

	postObj = {}
	postObj['method'] = 'POST'
	postObj['path'] = '/1/classes/route'
	postObj['body'] = one
	postRoutes.append(postObj)

	batchCount = batchCount + 1
	if batchCount == 20:
		batchCount = 0

		postData = {}
		postData['requests'] = postRoutes
		params = json.dumps(postData)
		connection = httplib.HTTPSConnection('api.parse.com')
		connection.request('POST', '/1/batch', params, headers)
		response = json.loads(connection.getresponse().read())
		connection.close()

		print response
		
		time.sleep(0.1)