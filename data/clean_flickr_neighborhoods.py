import json

save = []

with open('flickr_shapes_neighbourhoods.json') as f:
    data = json.load(f)
    array = data['features']

    for one in array:
    	# print one['id']
    	label = one['properties']['label']
    	new = {}
    	if 'New York, NY, US' in label:
    		new['name'] = label.split(', ')[0].lower()
    		new['bbox'] = one['geometry']['bbox']
    		new['coordinates'] = one['geometry']['coordinates']
    		print new['name']
    		save.append(new)
            
with open('neighborhood.json', 'w') as outfile:
	json.dump(save, outfile)
