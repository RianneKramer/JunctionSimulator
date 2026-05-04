from fastapi import FastAPI, Request
import json

app = FastAPI()

with open("baseline.json") as f:
    baseline = json.load(f)


def compare(actual, expected, path=""):
    errors = []

    if isinstance(expected, dict):
        if not isinstance(actual, dict):
            return [f"{path}: expected object"]

        for k in expected:
            if k not in actual:
                errors.append(f"Missing key: {path}.{k}")
            else:
                errors += compare(actual[k], expected[k], f"{path}.{k}")

        for k in actual:
            if k not in expected:
                errors.append(f"Unexpected key: {path}.{k}")

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


@app.post("/capture")
async def capture(request: Request):
    data = await request.json()

    errors = compare(data, baseline)

    if errors:
        print("REGRESSION FAIL:", errors)
        return {
            "status": "fail",
            "errors": errors
        }

    print("REGRESSION PASS")
    return {
        "status": "pass"
    }