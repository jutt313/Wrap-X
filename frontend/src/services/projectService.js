import { apiClient } from '../api/client';

class ProjectService {
  async getProjects() {
    try {
      return await apiClient.get('/api/projects');
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  }

  async getDefaultProject() {
    try {
      const projects = await apiClient.get('/api/projects');
      // Find default project (name contains "Default Project")
      const defaultProject = projects.find(p => 
        p.name.includes('Default Project') || p.name.includes('Default')
      );
      return defaultProject || projects[0]; // Return first project if no default found
    } catch (error) {
      console.error('Error fetching default project:', error);
      throw error;
    }
  }

  async createProject(name, description = null) {
    try {
      return await apiClient.post('/api/projects', { name, description });
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  async deleteProject(publicId) {
    try {
      return await apiClient.delete(`/api/projects/${publicId}`);
    } catch (error) {
      console.error(`Error deleting project ${publicId}:`, error);
      throw error;
    }
  }
}

export const projectService = new ProjectService();

