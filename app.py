from flask import Flask, jsonify, render_template, request
import pymysql

app = Flask(__name__, static_url_path='/static')


def get_places_within_bounds(min_lat, max_lat, min_lng, max_lng):
  connection = pymysql.connect(
    host='localhost',
    user='root',
    password='123',
    database='lg'
  )
  cursor = connection.cursor(pymysql.cursors.DictCursor)
  cursor.execute("""
        SELECT p.id, p.title, p.latitude, p.longitude, p.date, p.address, p.email,
               p.phone, p.website, p.quote,
               GROUP_CONCAT(DISTINCT i.url SEPARATOR ', ') AS images,
               GROUP_CONCAT(DISTINCT y.url SEPARATOR ', ') AS youtube_links
        FROM Places p
        LEFT JOIN Images i ON p.id = i.place_id
        LEFT JOIN YoutubeLinks y ON p.id = y.place_id
        WHERE p.latitude BETWEEN %s AND %s
        AND p.longitude BETWEEN %s AND %s
        GROUP BY p.id
    """, (min_lat, max_lat, min_lng, max_lng))
  places = cursor.fetchall()
  connection.close()
  return places


@app.route('/')
def index():
  return render_template('index.html')


def add_google_satellite_image(places, api_key):
  for place in places:
    place['satellite_image'] = get_google_maps_static_image(place['latitude'], place['longitude'], api_key)
  return places


def get_google_maps_static_image(lat, lng, api_key):
  return f"https://maps.googleapis.com/maps/api/staticmap?center={lat},{lng}&zoom=15&size=600x400&maptype=satellite&key={api_key}"


@app.route('/api/places')
def places():
  min_lat = request.args.get('min_lat', type=float)
  max_lat = request.args.get('max_lat', type=float)
  min_lng = request.args.get('min_lng', type=float)
  max_lng = request.args.get('max_lng', type=float)
  if min_lat is not None and max_lat is not None and min_lng is not None and max_lng is not None:
    places = get_places_within_bounds(min_lat, max_lat, min_lng, max_lng)
    places = add_google_satellite_image(places, 'AIzaSyDF8XTf9WyBaiCA-cUhygDXQNh3IRx0y8o')
    return jsonify(places)
  return jsonify([])


@app.route('/api/add_place', methods=['POST'])
def add_place():
  data = request.get_json()
  connection = pymysql.connect(
    host='localhost',
    user='root',
    password='1234',
    database='lostgermany'
  )
  cursor = connection.cursor()
  cursor.execute("""
        INSERT INTO Places (title, latitude, longitude, address, email, phone, website, quote)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (data['title'], data['latitude'], data['longitude'], data['address'], data['email'], data['phone'], data['website'], data['quote']))
  connection.commit()
  connection.close()
  return jsonify({'success': True})


if __name__ == '__main__':
  app.run(debug=True)
