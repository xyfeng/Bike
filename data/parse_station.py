import json, urllib2, time

stations = json.load(open('citibike.json'))['stationBeanList']
neighborhoods = json.load(open('neighborhood.json'))
stationJSON = []

# Create table
# stationCursor.execute('''CREATE TABLE stations (id INTEGER PRIMARY KEY, name TEXT, lat REAL, lng REAL, bikes INTEGER, postal INTEGER, district TEXT)''')

for station in stations:
	id = station['id']
	# print id
	name = station['stationName']
	lat = station['latitude']
	lng = station['longitude']
	bikes = station['totalDocks']

	# Get Neighborhood
	bboxSize = 2
	for n in neighborhoods:
		bbox = n['bbox']
		if lat < bbox[3] and lat > bbox[1] and lng < bbox[2] and lng > bbox[0]:
			newSize = bbox[2] + bbox[3] - bbox[0] - bbox[1]
			if newSize < bboxSize:
				bboxSize = newSize
				print n['name']
				neighborhood = n['name']

	# Get Postal Code
	postalURL = "http://maps.googleapis.com/maps/api/geocode/json?latlng=" + str(lat) + "," + str(lng) + "&sensor=false"
	postalResponse = json.load(urllib2.urlopen(postalURL))
	postal = int(postalResponse['results'][0]['address_components'][-1]['short_name'])
	print postal

	one = {}
	one['sid'] = id
	one['name'] = name
	one['lat'] = lat
	one['lng'] = lng
	one['bikes'] = bikes
	one['postal'] = postal
	one['neighborhood'] = neighborhood
	stationJSON.append(one)

with open('station.json', 'w') as outfile:
  json.dump(stationJSON, outfile)

