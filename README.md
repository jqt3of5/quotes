# Recommended Setup (On a RaspberryPi)

1. Checkout the latest source, or newest version. 
  The branch `RaspberryPiPort` has the bleeding edge for changes. 
  Tags that have `_raspberrypi` are tested releases for the pi based on the `RaspberryPiPort` branch. 
2. Install MongoDB. `sudo apt-get install mongodb`. Currently raspbian only supports an old version of mongo
3. Edit `nano .config/lxsession/LXDE-pi/autostart`
4. Add 
```
@xset s off
@xset -dpms
@xset s noblank
@unclutter
@chromium-browser --noerrdialogs --kiosk http://localhost
```

5. Create a service file `sudo nano /lib/systemd/system/quotes.service` And add:
```
[Unit]
Description=A Service to show published content from the various teams
After=multi-user.target

[Service]
Type=idle
ExecStart=/usr/bin/nodejs /home/pi/quotes/server.js > /home/pi/quotes/log/quotes.log

[Install]
WantedBy=multi-user.target
```
With the correct path to server.js where you checked out the code. 

6. Change the file permissions `sudo chmod 644 /lib/systemd/system/quotes.service`
7. Then enable the service `sudo systemctl enable quotes.service`
8. Start mongodb `sudo service mongod start`
9. Start our service `sudo systemctl start quotes.service`
10. restart the pi!

Google Sheets setup
1. Enable the google sheets service for you account here: https://developers.google.com/sheets/api/quickstart/nodejs
2. Download the credentials.json, and put it in the top level of the checked out repo
3. Run "node googleapis.js" on a computer with a browser. 
4. Follow the steps, you'll recieve a token.json. 
5. Ensure token.json and credentials.json are both in the top level of your repo on the raspaberry pi. 
