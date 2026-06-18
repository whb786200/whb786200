# Concrete Compressive Strength Predictions based on Ultrasonic Pulse Velocity (UPV)
This repository includes a machine learning application to predict concrete compressive strength using non-destructive ultrasonic pulse velocity (UPV) test results. The database comprises 5,680 UPV-strength test results from 83 published studies, with 20 input features and one response. These variables encompass material age, location, composition, geometry, NDT parameters and adopted standards. 

The response variable is the compressive strength determined through destructive testing of cubic, cylindrical, or drilled core specimens, normalised to a reference cylinder with a 300×150 mm geometry. A CatBoost regression model is built, trained, and integrated within this repository with a Tree-Structured Parzen Estimator (TPE) for hyperparameter optimisation. 
	
# Database
The code presented in this repository focuses on the prediction of the compressive strength through a single NDT method (UPV) and is taken from a larger study focusing on the predictive ability of other techniques, such as rebound hammer (RH) and SonReb (UPV and RH combined). The journal article describing the derivation and application this work is published open-access at: https://doi.org/10.1016/j.ndteint.2025.103549. 

UPV Data.csv provides all the necessary data to execute the run.py script. The complete database is available open source at: https://doi.org/10.5281/zenodo.14921019. 

# Model Training
Each model is trained and tested using a k-fold cross-validation approach. A 10-fold split is implemented, with the hyperparameters optimised through the TPE in each fold.
	
# Instructions
Follow the instructions below to execute the script and train the models:

1. Download the zip file containing all files in the repository to your local drive. 
2. Extract or unzip the folder, keeping all files together without moving the relative path between them. 
3. Using a Python environment of your choice (e.g., Jupyter Notebook, Visual Studio Code, Spyder, etc.), open the run.py file.
4. Check that all Python dependencies required (see below) to run the script have been installed in your Python environment.
5. Once all the necessary packages are installed, execute the run.py script to train and test the models. 
6. Due to the extensiveness of the TPE algorithm, the script will likely take between 2 and 3 hours to run entirely, depending on the CPU of the local device.

# Code Structure
The run.py file is organised in the following format:

1. Data Preparation
2. Functions (TPE and performance metrics)
3. Model building, K-fold cross-validation, and prediction outputs.
4. Model performance and error evaluation

The run.py script outputs two Excel files, one containing the error metrics (R2, MSE, RMSE, MAE, and MAPE) for all ten folds, and the other containing the true vs. predicted values across all testing sets. 

# Dependencies
The application includes the following dependencies to run:

* Python == 3.11.0
* Pandas == 2.0.3
* NumPy == 1.26.4
* Scikit-Learn == 1.3.2
* Catboost == 1.2.7
* Optuna == 4.2.0

