import numpy as np
import pandas as pd

import time

from sklearn.model_selection import KFold
from sklearn.preprocessing import MinMaxScaler # Normalization

import catboost as cb # CatBoost
from catboost import Pool, CatBoostRegressor
import optuna


### ------------------------- DATA PREPARATION ---------------------------- ###


# Load database
df = pd.read_csv("UPV Data.csv")

# Separate features by type
# Categorical Columns
cat_cols = ["Country", "Specimen_Type", "Rebar Present", "Device_Brand",
            "Procedure", "Test_Type", "Core Specimen"]

# Numerical Columns   
num_cols = ["Specimen Age (days)", "Transducer Diameter (mm)", "Transducer Frequency (kHz)", "No. UPV Tests", "Vp", 
"Height (mm)", "Width/Diameter (mm)", "Max Aggregate Size (mm)", "W/C Ratio", "Design Strength (MPa)"] 

# Response variable (output)
out_col = ["fc_cyl"]

# Keep categorical features as strings for CatBoost model
scaler = MinMaxScaler()
X_ns = pd.DataFrame(scaler.fit_transform(df[num_cols]), columns=num_cols)

# Normalize categorical features: lowercase, strip spaces, and replace multiple spaces
df[cat_cols] = df[cat_cols].astype("string").fillna("missing")  # Replace NaN values
df[cat_cols] = df[cat_cols].apply(lambda col: col.str.lower().str.strip().str.replace(r'\s+', ' ', regex=True))

# Feature Dataframe for CatBoost model
X_df = pd.concat([X_ns, df[cat_cols]], axis=1)
X_cat = X_df.to_numpy()

# Vp values for plotting
vp = df["Vp"]

# Transform response variable
Y = np.log(df[out_col])
Y = Y.to_numpy()


### ------------------------- FUNCTIONS ---------------------------- ###


# Define the TPE optimization objective function for each fold
def objective(trial, X_train, Y_train, X_val, Y_val, cat_features):
    params = {
        'loss_function': 'MAE',
        'iterations': 1000,
        'learning_rate': trial.suggest_loguniform('learning_rate', 0.01, 0.3),
        'depth': trial.suggest_int('depth', 4, 10),
        'l2_leaf_reg': trial.suggest_loguniform('l2_leaf_reg', 1e-3, 10.0),
        'verbose': -1,
        'thread_count': -1,
        'nan_mode': 'Min'
    }

    # Prepare CatBoost datasets
    cbr_train = cb.Pool(X_train, Y_train, cat_features=cat_features)
    cbr_val = cb.Pool(X_val, Y_val, cat_features=cat_features)

    # Train model and validate
    model = cb.CatBoostRegressor(**params)
    model.fit(cbr_train, 
              eval_set=cbr_val, 
              early_stopping_rounds=50, 
              verbose=False)

    y_pred = model.predict(X_val)
    y_pred_inv = np.exp(y_pred).reshape(-1, 1)
    Y_val_inv = np.exp(Y_val)

    return -r_squared(Y_val_inv, y_pred_inv)  # Negative for Optuna (since it minimizes)

# R^2
def r_squared(Y, y_hat):
    y_bar = Y.mean()
    ss_res = ((Y - y_hat)**2).sum()
    ss_tot = ((Y - y_bar)**2).sum()
    return 1 - (ss_res/ss_tot)

# MSE
def mean_squared_err(Y, y_hat):
    var = ((Y - y_hat)**2).sum()
    n = len(Y)
    return var/n

# RMSE
def root_mean_squared_err(Y, y_hat):
    MSE = mean_squared_err(Y, y_hat)
    return np.sqrt(MSE)

# MAE
def mean_abs_err(Y, y_hat):
    abs_var = (np.abs(Y - y_hat)).sum()
    n = len(Y)
    return abs_var/n

# MAPE
def mean_abs_perc_err(Y, y_hat):
    mape = np.mean(np.abs((Y - y_hat)/ y_hat))*100
    return mape


### ------------------------- TRAIN & TEST MODELS ------------------------- ###
"""

Train, test and evaluate each model based on the full UPV dataset and using K-Fold cross-validation. 

The hyperparameters for each fold are optimized through the Tree Structured Parzen Estimator.

The model performance metrics and predictions over the 10 folds are exported to Excel.


"""

kf = KFold(n_splits=10, random_state=1, shuffle=True) # Define the split - 10 folds

# Empty lists for storing error metrics
r2, mse, rmse, mae, mape = [], [], [], [], []

# Empty lists for combining test sets and predictions
Y_test_all, y_best_all = [], []

time_start = time.time()
optuna.logging.set_verbosity(optuna.logging.WARNING)  # Suppress info messages

i = 1

# Perform 10-fold cross-validation with hyperparameter tuning for each fold
for train_index, test_index in kf.split(X_cat, Y):
    
    X_train_cat, X_test_cat = X_cat[train_index], X_cat[test_index]
    Y_train, Y_test = Y[train_index], Y[test_index]
    Y_test_inv = np.exp(Y_test) # Convert test set back into original magnitude (log-transform)

    # Compile test data from all k-folds to use in plotting
    Y_test_all += Y_test_inv.tolist()
    
    # Get categorical feature indices
    cat_feature_indices = [X_df.columns.get_loc(col) for col in cat_cols]  

    # Optimize hyperparameters for the current fold
    study = optuna.create_study(direction='minimize')
    study.optimize(lambda trial: objective(trial, X_train_cat, Y_train, X_test_cat, Y_test, cat_feature_indices), n_trials=20)
    best_params = study.best_params  # Get best parameters for this fold

    # Train final model using best parameters
    cbr_train = cb.Pool(X_train_cat, Y_train, cat_features=cat_feature_indices)
    cbr_model = cb.CatBoostRegressor(**best_params, iterations=1000, verbose=False)
    cbr_model.fit(cbr_train)

    # Predict using the test set
    y_cbr_pred = cbr_model.predict(X_test_cat)
    y_cbr_inv = np.exp(y_cbr_pred).reshape(-1, 1)
    
    # Store predictions
    y_best_all += y_cbr_inv.tolist()
    
    # Compute error metrics and store
    r2.append(r_squared(Y_test_inv, y_cbr_inv))
    mse.append(mean_squared_err(Y_test_inv, y_cbr_inv))
    rmse.append(root_mean_squared_err(Y_test_inv, y_cbr_inv))
    mae.append(mean_abs_err(Y_test_inv, y_cbr_inv))
    mape.append(mean_abs_perc_err(Y_test_inv, y_cbr_inv))

    i += 1


time_end = time.time()
print("Elapsed time: {} minutes and {:.0f} seconds".format
      (int((time_end - time_start) // 60), (time_end - time_start) % 60)) 



### ------------------------- MODEL ERROR AND PERFORMANCE ------------------------- ###


# Concatenate error metrics into a single dataframe
df_err = pd.concat([pd.DataFrame(metric) for metric in [r2, mse, rmse, mae, mape]], axis=1)
df_err.columns = ["R2", "MSE", "RMSE", "MAE", "MAPE"]

# Dictionary of model names and corresponding lists
model_predictions = {
    "Y_test": np.array(Y_test_all).flatten(),
    "CBR": np.array(y_best_all).flatten()
}

# Convert dictionary to DataFrame
df_preds = pd.DataFrame(model_predictions)

# Save to Excel
df_err.to_excel('UPV Model Metrics.xlsx')
df_preds.to_excel("All UPV Model Predictions.xlsx", index=False)