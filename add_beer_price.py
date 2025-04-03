#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Mon Mar 31 21:42:13 2025

@author: logannicholson
"""

from config import supabase
from datetime import datetime

def add_beer_price(pub_name, location, beer_name, size, price, lat, lon):
    data = {
        "pub_name": pub_name,
        "location": location,
        "beer_name": beer_name,
        "size": size,
        "price": price,
        "last_updated": datetime.utcnow().isoformat(),
        "lat": lat,
        "lon":lon,
    }
    response = supabase.table("beer_prices").insert(data).execute()
    return response

# Example Usage
add_beer_price("The Drunken Kangaroo", "Melbourne, VIC", "Carlton Draught", "Pint", 10.50)
