import requests
import json

payload = {'query': 'earth'}
headers = {'User-Agent': 'scrape-thing/1.0 by nagi2000'}
r = requests.post("http://www.reddit.com/api/search_reddit_names.json", data=payload)
res = json.loads(r.text)
print(res["names"])
