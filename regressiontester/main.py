from fastapi import FastAPI, Request
import json
import requests
import time

app = FastAPI()

CONTROLLER_URL = "http://"

#conflictmatrix
CONFLICT_MATRIX = {
    "1.1": ["5.1", "9.1", "42", "22", "28.1", "88.1", "31.1", "31.2", "38.1", "38.2"],

    "2.1": ["5.1", "6.1", "9.1", "10.1", "11.1", "12.1", "42", "22", "26.1", "86.1", "31.1", "31.2", "36.1", "36.2"],

    "5.1": ["1.1", "2.1", "8.1", "9.1", "12.1", "42", "22", "28.1", "88.1", "32.1", "32.2", "38.1", "38.2", "sb"],

    "6.1": ["2.1", "8.1", "9.1", "10.1", "11.1", "12.1", "42", "26.1", "86.1", "36.1", "36.2", "sb"],

    "7.1": ["11.1", "26.1", "86.1", "35.1", "35.2", "sb"],

    "8.1": ["5.1", "6.1", "11.1", "12.1", "22", "26.1", "86.1", "32.1", "32.2", "35.1", "35.2"],

    "9.1": ["1.1", "2.1", "5.1", "6.1", "11.1", "12.1", "42", "26.1", "28.1", "86.1", "88.1", "35.1", "35.2", "38.1", "38.2"],

    "10.1": ["2.1", "6.1", "42", "26.1", "28.1", "86.1", "88.1", "36.1", "36.2", "37.1", "37.2"],

    "11.1": ["2.1", "6.1", "7.1", "8.1", "9.1", "42", "28.1", "88.1", "37.1", "37.2", "sb"],

    "12.1": ["2.1", "5.1", "6.1", "8.1", "9.1", "42", "22", "28.1", "88.1", "32.1", "32.2", "37.1", "37.2"],

    "42": ["1.1", "2.1", "5.1", "6.1", "9.1", "10.1", "11.1", "12.1", "22", "26.1", "28.1", "86.1", "88.1", "31.1", "31.2", "36.1", "36.2", "38.1", "38.2"],

    "22": ["1.1", "2.1", "5.1", "8.1", "12.1", "42"],

    "26.1": ["2.1", "6.1", "7.1", "8.1", "9.1", "10.1", "42"],

    "28.1": ["1.1", "5.1", "9.1", "10.1", "11.1", "12.1", "42"],

    "86.1": ["2.1", "6.1", "7.1", "8.1", "9.1", "10.1", "42"],

    "88.1": ["1.1", "5.1", "9.1", "10.1", "11.1", "12.1", "42"],

    "31.1": ["1.1", "2.1", "42"],

    "31.2": ["1.1", "2.1", "42"],

    "32.1": ["5.1", "8.1", "12.1"],

    "32.2": ["5.1", "8.1", "12.1"],

    "35.1": ["7.1", "8.1", "9.1"],

    "35.2": ["7.1", "8.1", "9.1"],

    "36.1": ["2.1", "6.1", "10.1", "42"],

    "36.2": ["2.1", "6.1", "10.1", "42"],

    "37.1": ["10.1", "11.1", "12.1"],

    "37.2": ["10.1", "11.1", "12.1"],

    "38.1": ["1.1", "5.1", "9.1", "42"],

    "38.2": ["1.1", "5.1", "9.1", "42"],

    "sb": ["5.1", "6.1", "7.1", "11.1"]
}

traffic_runtime = {}
railway_runtime = {}

MIN_TIMINGS = {
    "car": {
        "green": 6
    },

    "bus": {
        "green": 4
    },

    "bike": {
        "green": 5
    },

    "pedestrian": {
        "green": 4
    },

    "yellow": 3.5
}

TRAFFIC_LIGHT_TYPES = {
    "1.1": "car",
    "2.1": "car",
    "5.1": "car",
    "6.1": "car",
    "7.1": "car",
    "8.1": "car",
    "9.1": "car",
    "10.1": "car",
    "11.1": "car",
    "12.1": "car",
    "42": "bus",
    "22": "bike",
    "26.1": "bike",
    "28.1": "bike",
    "86.1": "bike",
    "88.1": "bike",
    "31.1": "pedestrian",
    "31.2": "pedestrian",
    "32.1": "pedestrian",
    "32.2": "pedestrian",
    "35.1": "pedestrian",
    "35.2": "pedestrian",
    "36.1": "pedestrian",
    "36.2": "pedestrian",
    "37.1": "pedestrian",
    "37.2": "pedestrian",
    "38.1": "pedestrian",
    "38.2": "pedestrian",
    "sb": "train"
}

with open("baseline.json") as f:
    baseline = json.load(f)

def compare(actual, expected, path=""):
    errors = []

    if isinstance(expected, dict):
        if not isinstance(actual, dict):
            return [f"{path}: expected object"]

        for variable in expected:
            if variable not in actual:
                errors.append(f"Missing key: {path}.{variable}")
            else:
                errors += compare(actual[variable], expected[variable], f"{path}.{variable}")

        for variable in actual:
            if variable not in expected:
                errors.append(f"Unexpected key: {path}.{variable}")

    elif isinstance(expected, list):
        if not isinstance(actual, list):
            return [f"{path}: expected list"]

        if expected:
            for i, item in enumerate(actual):
                errors += compare(item, expected[0], f"{path}[{i}]")

    else:
        if type(actual) != type(expected):
            errors.append(f"Type mismatch at {path}")

    return errors

def check_unknown_traffic_lights(data):
    errors = []

    traffic_lights = data.get("trafficLights", {})

    for light_id in traffic_lights.keys():
        if light_id not in ALLOWED_TRAFFIC_LIGHTS:
            errors.append(f"Unknown traffic light id: {light_id}")

    return errors

def validate_duration(tid, old_state, duration):
    light_type = TRAFFIC_LIGHT_TYPES.get(tid)

    if old_state == YELLOW:
        expected = MIN_TIMINGS["yellow"]

        if abs(duration - expected) > 1:
            return f"{tid}: yellow lasted {duration:.2f}s, expected {expected}s"

    if old_state == GREEN:
        if light_type is None:
            return None

        expected = MIN_TIMINGS[light_type]["green"]

        if duration < expected:
            return f"{tid}: green too short ({duration:.2f}s), expected at least {expected}s"

    return None

def update_runtime(data):
    errors = []
    now = time.time()

    for tid, state in data.get("trafficLights", {}).items():

        if tid not in traffic_runtime:
            traffic_runtime[tid] = {
                "state": state,
                "since": now
            }
            continue

        old = traffic_runtime[tid]

        if old["state"] != state:
            duration = now - old["since"]

            err = validate_duration(tid, old["state"], duration)

            if err:
                errors.append(err)

            traffic_runtime[tid] = {
                "state": state,
                "since": now
            }

    return errors

ALLOWED_TRAFFIC_LIGHTS = set(CONFLICT_MATRIX.keys())
RED = 0
YELLOW = 1
GREEN = 2

def check_conflicts(data):

    errors = []

    traffic_lights = data["trafficLights"]

    for light_id, state in traffic_lights.items():

        if state == GREEN:

            conflicts = CONFLICT_MATRIX.get(light_id, [])

            for conflict_id in conflicts:

                conflict_state = traffic_lights.get(conflict_id)

                if conflict_state != RED:

                    errors.append(
                        f"{light_id} GREEN conflicts with "
                        f"{conflict_id}"
                    )

    return errors

@app.post("/data")
async def capture(request: Request):
    data = await request.json()

    print("Received simulator payload:")
    print(json.dumps(data, indent=2))

    #Validate simulator request against baseline
    errors = compare(data, baseline)

    if errors:
        return {
            "status": "fail",
            "error_type": "request_schema",
            "errors": errors
        }

    #Forward simulator data to controller
    try:
        response = requests.post(
            CONTROLLER_URL,
            json=data
        )

        controller_response = response.json()

        print("Controller response:")
        print(json.dumps(controller_response, indent=2))

    except Exception as error:
        return {
            "status": "controller_error",
            "message": str(error)
        }
    

    id_errors = check_unknown_traffic_lights(controller_response)
    if id_errors:
        return {
            "status": "fail",
            "error_type": "unknown_traffic_light",
            "errors": id_errors
        }

    #Check conflicts on CONTROLLER response
    conflict_errors = check_conflicts(controller_response)

    if conflict_errors:
        return {
            "status": "fail",
            "error_type": "conflict_matrix",
            "errors": conflict_errors
        }

    #Check timing on CONTROLLER response
    timing_errors = update_runtime(controller_response)

    if timing_errors:
        return {
            "status": "fail",
            "error_type": "timing",
            "errors": timing_errors
        }

    #If everything passed, return controller response to simulator
    return controller_response