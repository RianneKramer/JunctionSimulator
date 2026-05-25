from fastapi import FastAPI, Request
import json
import requests

app = FastAPI()

CONTROLLER_URL = "http://localhost:8080"

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

    try:
        response = requests.post(
            CONTROLLER_URL,
            json=data
        )

        controller_response = response.json()

        print("\nController response:")
        print(json.dumps(controller_response, indent=2))

        return controller_response

    except Exception as error:
        print("CONTROLLER ERROR")
        print(str(error))

        return {
            "status": "controller_error",
            "message": str(error)
        }