import sqlite3, json, urllib2

stations = json.load(open('citibike.json'))['stationBeanList']
stationJSON = []

stationConn = sqlite3.connect('stations.sqlite')
stationCursor = stationConn.cursor()

# Create table
# stationCursor.execute('''CREATE TABLE stations (id INTEGER PRIMARY KEY, name TEXT, lat REAL, lng REAL, bikes INTEGER, postal INTEGER, district TEXT)''')

for station in stations:
	id = station['id']
	name = station['stationName']
	lat = station['latitude']
	lng = station['longitude']
	bikes = station['totalDocks']

	# Get Postal Code
	postalURL = "http://maps.googleapis.com/maps/api/geocode/json?latlng=" + str(lat) + "," + str(lng) + "&sensor=false"
	postalResponse = json.load(urllib2.urlopen(postalURL))
	postal = int(postalResponse['results'][0]['address_components'][-1]['short_name'])
	print postal

	one = {}
	one['id'] = id
	one['name'] = name
	one['lat'] = lat
	one['lng'] = lng
	one['bikes'] = bikes
	stationJSON.append(one)

	# Get Neighborhood
	# if id == 258:
	# 	districURL = "http://query.mapfluence.com/2.0/MFDOCS/spatialquery.json?select=name&where=intersects({%22type%22:%22Point%22,%22coordinates%22:[" + str(lng) + "," + str(lat)+ "]})&from=umi.neighborhoods.geometry"
	# 	districResponse = json.load(urllib2.urlopen(districURL))
	# 	district = districResponse['features'][0]['properties']['name']
	# 	print districResponse

	# stationCursor.execute('''INSERT INTO stations(id, name, lat, lng, bikes, postal, district) VALUES(?,?,?,?,?,?,?)''', (id, name, lat, lng, bikes, postal, ''))

# Save (commit) the changes
stationConn.commit()
stationConn.close()

with open('nyc.json', 'w') as outfile:
  json.dump(stationJSON, outfile)

