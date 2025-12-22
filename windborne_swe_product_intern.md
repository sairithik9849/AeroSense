## Software Engineering Intern (Product) Application

Make a POST request to `https://windbornesystems.com/career_applications.json` with the following body:
```json
{
  "career_application": {
    "name": "your name",
    "email": "your email",
    "role": "Software Engineering Intern Product",
    "submission_url": "A publicly viewable URL which contains your engineering challenge submission -- see below",
    "portfolio_url": "A publicly viewable URL that points to either your portfolio, or a personal project",
    "resume_url": "A publicly viewable URL pointing to your resume",
    "notes": "Tell us about your background/interests, and anything else you'd like to add",
  }
}
```

### Engineering Challenge

**ASOS**, or Automated Surface Observing Systems, are weather stations used in the U.S. to provide real-time weather data. We've provided for you an API for accessing surface observation data for historical weather at https://sfc.windbornesystems.com with the following `GET` endpoints:

`/stations`: returns a list of all ASOS stations with details. 

`/historical_weather?station={station_id}`: given a `station_id`, will return the historical forecast for that location. 

Your challenge is to develop a web application that uses this weather data, enabling users to access information from any ASOS station worldwide. Potential projects include:
- Interactive map viewer
- Calendar interface
- Integrating the API with another dataset and visualizing it
- Other creative solutions -- think outside the box and showcase your creativity!

**Host your creation on a publicly accessible URL. This should be the actual interative webpage, not a static github repo link to the source code**.

API usage is limited to 20/minute. Also, **the data will sometimes be corrupted** (sorry!). If you have questions, submit them via a POST request alongside a way to contact you. We will not respond to comments on this gist, though.

Good luck and have fun :)


### More about the role
Hopefully you came across this gist from our careers page, but if not, here's the summary!
- [WindBorne Systems](http://windbornesystems.com/) designs, builds, and launches a new kind of smart weather balloon, then plugs this unique data into our own AI-based weather models. Our mission is to build a planetary nervous system. In the process, we can both save a huge amount of carbon emissions and help humanity adapt to extreme weather.
- This is for you if you like deranged software systems and pushing the limits of what's possible. This is not for you if you want a chill job selling ads.

- If you do all of the above, I promise you'll hear back from me within a few days :smile_cat: