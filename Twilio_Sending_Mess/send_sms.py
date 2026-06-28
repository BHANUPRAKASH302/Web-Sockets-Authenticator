import os
from twilio.rest import Client

# List of 5 people with their respective recipient numbers, twilio given numbers, and credentials
people = [
    {
        "name": "Person 1",
        "to": "+918309649014",
        "from": "+14782238981",
        "sid": "ACa775b017e39d99fc8012533d613bf0c2",
        "token": "1771122643a8191cffbd3d0271548ef6"
    },
    {
        "name": "Person 2",
        "to": "+919177264845",
        "from": "+17547572433",
        "sid": "ACbdac8e2fcf4f3b36f131e00a70d5ee06",
        "token": "aaa7939b4b954d01e945db56d2724a18"
    },
    {
        "name": "Person 3",
        "to": "+919985469699",
        "from": "+16098495529",
        "sid": "AC687a1c3cb0c7fc4f03762ea7c03b1144",
        "token": "69fb43b5d2adb3bf6c50c791fcbdc8c3"
    },
    {
        "name": "Person 4",
        "to": "+918523046539",
        "from": "+16626425546",
        "sid": "AC65fbbdae162ac724bf901e9709220f8e",
        "token": "0ba940b0d4e2d0086cd1687b4805eba9"
    },
    {
        "name": "Person 5",
        "to": "+916281939784",
        "from": "+18144488407",
        "sid": "AC311a9bc085af09e5a5fe320428d84c20",
        "token": "4214f8b0ea11e36c9f14f5fa636de370"
    }
]

# Send the message to each person using their respective Twilio credentials
for person in people:
    name = person["name"]
    to_number = person["to"]
    from_number = person["from"]
    sid = person["sid"]
    token = person["token"]
    
    print(f"--------------------------------------------------")
    print(f"Processing {name}:")
    print(f"  To:   {to_number}")
    print(f"  From: {from_number}")
    print(f"  SID:  {sid}")
    
    try:
        # Initialize Client specific to this person's Twilio account
        client = Client(sid, token)
        
        # Send SMS
        message = client.messages.create(
            body="Hello from Twilio! This is a test message.",
            from_=from_number,
            to=to_number
        )
        print(f"  Result: Message successfully sent! SID: {message.sid}")
    except Exception as e:
        print(f"  Result: Failed to send message. Error: {e}")

