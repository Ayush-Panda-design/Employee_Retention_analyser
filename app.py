from flask import Flask, render_template, request, jsonify
import joblib
import numpy as np
import pandas as pd
import os


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))

app = Flask(__name__)

prediction_history = []

MODEL_PATH = os.path.join(os.path.dirname(__file__), "attrition_model_package.pkl")
model_package = None

try:
    model_package = joblib.load(MODEL_PATH)
    print("✅ Model loaded successfully.")
except FileNotFoundError:
    print("⚠️  Model file not found. Place attrition_model_package.pkl in project root.")
except Exception as e:
    print(f"⚠️  Error loading model: {e}")


def preprocess_input(data: dict) -> pd.DataFrame:
    df = pd.DataFrame([data])
    df.columns = [c.strip() for c in df.columns]
    for col in ["EmployeeCount", "EmployeeNumber", "Over18", "StandardHours"]:
        df.drop(col, axis=1, inplace=True, errors="ignore")
    num_cols = [
        "Age", "DailyRate", "DistanceFromHome", "Education",
        "EnvironmentSatisfaction", "HourlyRate", "JobInvolvement",
        "JobLevel", "JobSatisfaction", "MonthlyIncome", "MonthlyRate",
        "NumCompaniesWorked", "PercentSalaryHike", "PerformanceRating",
        "RelationshipSatisfaction", "StockOptionLevel", "TotalWorkingYears",
        "TrainingTimesLastYear", "WorkLifeBalance", "YearsAtCompany",
        "YearsInCurrentRole", "YearsSinceLastPromotion", "YearsWithCurrManager",
    ]
    for col in num_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
    if "MonthlyIncome" in df.columns and "TotalWorkingYears" in df.columns:
        df["IncomePerExperience"] = df["MonthlyIncome"] / (df["TotalWorkingYears"] + 1)
    if "MonthlyIncome" in df.columns and "JobLevel" in df.columns:
        df["IncomePerLevel"] = df["MonthlyIncome"] / df["JobLevel"].replace(0, 1)
    if "YearsAtCompany" in df.columns and "TotalWorkingYears" in df.columns:
        df["CompanyLoyaltyRatio"] = df["YearsAtCompany"] / (df["TotalWorkingYears"] + 1)
    if "YearsSinceLastPromotion" in df.columns and "YearsAtCompany" in df.columns:
        df["PromotionRate"] = df["YearsSinceLastPromotion"] / (df["YearsAtCompany"] + 1)
    if "YearsAtCompany" in df.columns:
        df["tenure_group"] = pd.cut(
            df["YearsAtCompany"], bins=[0, 2, 5, 10, 40], labels=[0, 1, 2, 3]
        )
    df.drop(["MonthlyIncome", "TotalWorkingYears", "JobLevel", "YearsSinceLastPromotion"],
            axis=1, inplace=True, errors="ignore")
    df = pd.get_dummies(df, drop_first=True)
    return df


def get_risk_factors(data: dict, prob: float) -> list:
    factors = []
    if data.get("OverTime") == "Yes":
        factors.append({"label": "Overtime Work", "weight": "high"})
    if data.get("BusinessTravel") == "Travel_Frequently":
        factors.append({"label": "Frequent Travel", "weight": "medium"})
    if int(data.get("JobSatisfaction", 3)) <= 2:
        factors.append({"label": "Low Job Satisfaction", "weight": "high"})
    if int(data.get("EnvironmentSatisfaction", 3)) <= 2:
        factors.append({"label": "Poor Work Environment", "weight": "medium"})
    if int(data.get("WorkLifeBalance", 3)) <= 2:
        factors.append({"label": "Poor Work-Life Balance", "weight": "high"})
    if int(data.get("DistanceFromHome", 5)) > 20:
        factors.append({"label": "Long Commute Distance", "weight": "medium"})
    if int(data.get("YearsAtCompany", 5)) <= 2:
        factors.append({"label": "Early Tenure Employee", "weight": "medium"})
    if int(data.get("YearsSinceLastPromotion", 1)) >= 5:
        factors.append({"label": "No Recent Promotion", "weight": "medium"})
    if int(data.get("NumCompaniesWorked", 1)) >= 5:
        factors.append({"label": "High Job-Hopping History", "weight": "high"})
    if int(data.get("RelationshipSatisfaction", 3)) <= 2:
        factors.append({"label": "Low Relationship Satisfaction", "weight": "low"})
    if int(data.get("MonthlyIncome", 5000)) < 3000:
        factors.append({"label": "Below-Average Income", "weight": "high"})
    if int(data.get("StockOptionLevel", 1)) == 0:
        factors.append({"label": "No Stock Options", "weight": "low"})
    if prob < 0.35:
        if int(data.get("JobSatisfaction", 3)) >= 3:
            factors.append({"label": "Good Job Satisfaction", "weight": "positive"})
        if int(data.get("YearsAtCompany", 5)) >= 5:
            factors.append({"label": "Established Tenure", "weight": "positive"})
        if int(data.get("WorkLifeBalance", 3)) >= 3:
            factors.append({"label": "Healthy Work-Life Balance", "weight": "positive"})
    return factors[:6]


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/about")
def about():
    return render_template("about.html")


@app.route("/predict", methods=["POST"])
def predict():
    if model_package is None:
        return jsonify({"error": "Model not loaded. Place attrition_model_package.pkl in project root."}), 500
    try:
        raw = request.get_json()
        if not raw:
            return jsonify({"error": "No JSON data received."}), 400
        pipeline  = model_package.get("model")
        threshold = model_package.get("threshold", 0.32)
        df = preprocess_input(raw)
        try:
            train_cols = pipeline.feature_names_in_
            df = df.reindex(columns=train_cols, fill_value=0)
        except AttributeError:
            pass
        prob       = float(pipeline.predict_proba(df)[:, 1][0])
        prediction = int(prob >= threshold)
        prob_pct   = round(prob * 100, 1)
        risk_level = (
            "High Risk"   if prob >= 0.65 else
            "Medium Risk" if prob >= 0.40 else
            "Low Risk"
        )
        factors = get_risk_factors(raw, prob)
        record = {
            "name":       raw.get("EmployeeName", "Anonymous"),
            "department": raw.get("Department", "—"),
            "role":       raw.get("JobRole", "—"),
            "prob":       prob_pct,
            "risk":       risk_level,
            "prediction": prediction,
        }
        prediction_history.append(record)
        if len(prediction_history) > 20:
            prediction_history.pop(0)
        return jsonify({
            "prediction":  prediction,
            "probability": prob_pct,
            "risk_level":  risk_level,
            "threshold":   threshold,
            "factors":     factors,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/history", methods=["GET"])
def history():
    return jsonify({"history": list(reversed(prediction_history[-10:]))})


@app.route("/clear_history", methods=["POST"])
def clear_history():
    prediction_history.clear()
    return jsonify({"status": "cleared"})


if __name__ == "__main__":
    app.run(debug=True)