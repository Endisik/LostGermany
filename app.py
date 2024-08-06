from flask import Flask, jsonify, render_template, request
import pymysql

app = Flask(__name__)

def get_places_within_bounds(min_lat, max_lat, min_lng, max_lng):
  connection = pymysql.connect(
    host='localhost',
    user='root',
    password='1234',
    database='lostgermany'
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

@app.route('/api/places')
def places():
  min_lat = request.args.get('min_lat', type=float)
  max_lat = request.args.get('max_lat', type=float)
  min_lng = request.args.get('min_lng', type=float)
  max_lng = request.args.get('max_lng', type=float)
  if min_lat is not None and max_lat is not None and min_lng is not None and max_lng is not None:
    places = get_places_within_bounds(min_lat, max_lat, min_lng, max_lng)
    return jsonify(places)
  return jsonify([])

if __name__ == '__main__':
  app.run(debug=True)
