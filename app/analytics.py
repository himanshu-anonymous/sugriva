import networkx as nx
import torch
import torch.nn.functional as F
from torch_geometric.nn import GCNConv
from sklearn.ensemble import IsolationForest
import shap
import numpy as np

class STGNN(torch.nn.Module):
    def __init__(self, num_features):
        super(STGNN, self).__init__()
        self.conv1 = GCNConv(num_features, 16)
        self.conv2 = GCNConv(16, 8)
        self.fc = torch.nn.Linear(8, 1)

    def forward(self, x, edge_index):
        x = self.conv1(x, edge_index)
        x = F.relu(x)
        x = self.conv2(x, edge_index)
        x = F.relu(x)
        x = self.fc(x)
        return torch.sigmoid(x)

class SugrivaAnalyticsMesh:
    def __init__(self):
        self.isolation_forest = IsolationForest(n_estimators=100, n_jobs=-1, random_state=42)
        dummy_data = np.random.rand(100, 4)
        self.isolation_forest.fit(dummy_data)
        
        self.gnn_model = STGNN(num_features=4)
        self.gnn_model.eval()
        
        self.mock_base_matrix = np.random.rand(10, 4)
        
        def model_predict(data):
            tensor_data = torch.FloatTensor(data)
            dummy_edge_index = torch.tensor([[0], [0]], dtype=torch.long)
            
            with torch.no_grad():
                results = []
                for row in tensor_data:
                    out = self.gnn_model(row.unsqueeze(0), dummy_edge_index)
                    results.append(out.item())
            return np.array(results)
            
        self.explainer = shap.KernelExplainer(model_predict, self.mock_base_matrix)

    def generate_topology(self, telemetry_id: str, source_ip: str, sender_token: str) -> nx.Graph:
        G = nx.Graph()
        bridge_node = f"BRIDGE-{telemetry_id}"
        
        G.add_node(bridge_node)
        G.add_node(source_ip)
        G.add_node(sender_token)
        
        G.add_edge(bridge_node, source_ip)
        G.add_edge(bridge_node, sender_token)
        
        return G

    def run_anomaly_isolation(self, features: list) -> bool:
        feature_matrix = np.array(features).reshape(1, -1)
        prediction = self.isolation_forest.predict(feature_matrix)
        return bool(prediction[0] == -1)

    def calculate_risk_score(self, features: list, edges: list) -> float:
        x = torch.FloatTensor([features])
        edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous()
        
        with torch.no_grad():
            risk_score = self.gnn_model(x, edge_index)
            
        clamped_score = torch.clamp(risk_score, min=0.0, max=1.0)
        return float(clamped_score.item())

    def compute_shap_values(self, features: list) -> dict:
        feature_matrix = np.array(features).reshape(1, -1)
        shap_values = self.explainer.shap_values(feature_matrix, silent=True)
        
        if isinstance(shap_values, list):
            shap_values = shap_values[0]
            
        metrics = {
            "source_ip_attribution": float(shap_values[0][0]),
            "auth_status_attribution": float(shap_values[0][1]),
            "amount_attribution": float(shap_values[0][2]),
            "velocity_attribution": float(shap_values[0][3])
        }
        return metrics
