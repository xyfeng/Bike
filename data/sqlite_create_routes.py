import sqlite3, ijson, urllib2
import decoder

routes = ijson.items(open('route.json'), 'results.item')

routeConn = sqlite3.connect('routes.sqlite')
routeCursor = routeConn.cursor()

# Create table
routeCursor.execute('''CREATE TABLE routes (start INTEGER, end INTEGER, duration REAL, distance REAL, points TEXT)''')

for route in routes:
	start = str(route['startID'])
	end = str(route['endID'])
	print 'from ' + start + ' to ' + end

	duration = route['duration']
	distance = route['distance']

	overview_polyline = route['overview_polyline']
	points = decoder.decode(overview_polyline)
	pointsStr = '|'.join(','.join(map(str, p)) for p in points)

	routeCursor.execute('''INSERT INTO routes(start, end, duration, distance, points) VALUES(?,?,?,?,?)''', (start, end, duration, distance, pointsStr))

# Save (commit) the changes
routeConn.commit()
routeConn.close()

