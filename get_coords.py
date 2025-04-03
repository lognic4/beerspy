#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Wed Apr  2 14:08:02 2025

@author: logannicholson
"""

import requests

def get_coordinates(address):
    url = f"https://nominatim.openstreetmap.org/search"
    params = {
        "q": address,
        "format": "json",
        "addressdetails": 1,
        "limit": 1
    }
    response = requests.get(url, params=params)
    data = response.json()

    if data:
        lat = data[0]['lat']
        lon = data[0]['lon']
        return lat, lon
    else:
        return None, None

# Example Usage
lat, lon = get_coordinates("The Drunken Kangaroo, Melbourne, VIC")
print(f"Latitude: {lat}, Longitude: {lon}")
