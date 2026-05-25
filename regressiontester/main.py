from fastapi import FastAPI, Request
import json
import requests
import time

app = FastAPI()

CONTROLLER_URL = "http://10.235.84.139:6969/data"

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
    "31.1": "bike",
    "42": "pedestrian"
}

with open("baseline.json") as f:
    baseline = json.load(f)

with open("conflictmatrix.json") as f:
    trafficlight_registry = json.load(f)

    ALLOWED_TRAFFIC_LIGHTS = set(
        trafficlight_registry["trafficLights"].keys()
    )


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

def check_traffic_light_ids(data):
    errors = []

    for light in data.get("trafficLights", []):
        id = light.get("id")

        if id not in ALLOWED_TRAFFIC_LIGHTS:
            errors.append(f"Unknown traffic light id: {id}")

    return errors

def validate_duration(tid, old_state, duration):

    light_type = TRAFFIC_LIGHT_TYPES.get(tid)

    if old_state == "yellow":

        expected = MIN_TIMINGS["yellow"]

        if abs(duration - expected) > 1:
            return (
                f"{tid}: yellow lasted "
                f"{duration:.2f}s "
                f"(expected {expected}s)"
            )

    if old_state == "green":

        expected = MIN_TIMINGS[light_type]["green"]

        if duration < expected:
            return (
                f"{tid}: green too short "
                f"({duration:.2f}s)"
            )

    return None

def update_runtime(data):

    errors = []

    now = time.time()

    for tl in data.get("trafficLights", []):

        tid = tl["id"]
        state = tl["state"]

        if tid not in traffic_runtime:

            traffic_runtime[tid] = {
                "state": state,
                "since": now
            }

            continue

        old = traffic_runtime[tid]

        if old["state"] != state:

            duration = now - old["since"]

            err = validate_duration(
                tid,
                old["state"],
                duration
            )

            if err:
                errors.append(err)

            traffic_runtime[tid] = {
                "state": state,
                "since": now
            }

    return errors

@app.post("/data")
async def capture(request: Request):

    data = await request.json()

    print("Received payload:")
    print(json.dumps(data, indent=2))

    errors = compare(data, baseline)

    if errors:
        print("REGRESSION FAIL")
        for err in errors:
            print(err)

        return {
            "status": "fail",
            "errors": errors
        }

    print("REGRESSION PASS")

    timing_errors = update_runtime(data)

    if timing_errors:

        print("TIMING FAIL")

        for err in timing_errors:
            print(err)

        return {
            "status": "fail",
            "error_type": "timing",
            "errors": timing_errors
        }

    id_errors = check_traffic_light_ids(data)

    if id_errors:
        print("TRAFFIC LIGHT VALIDATION FAIL")

        for err in id_errors:
            print(err)

        return {
            "status": "fail",
            "error_type": "unknown_traffic_light",
            "errors": id_errors
        }

    try:
        response = requests.post(
            CONTROLLER_URL,
            json=data
        )

        controller_response = response.json()

        print("Controller response:")
        print(json.dumps(controller_response, indent=2))

        return controller_response

    except Exception as error:
        print("CONTROLLER ERROR")
        print(str(error))

        return {
            "status": "controller_error",
            "message": str(error)
        }