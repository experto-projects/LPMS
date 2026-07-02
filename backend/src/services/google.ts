/**
 * Google Service Layer for interacting with Google Drive and Google Docs APIs.
 * This file contains pure business logic and does not communicate directly with the routes or controllers.
 */

export interface GoogleDocFile {
  id: string;
  name: string;
  modifiedTime: string;
}

export interface GoogleDocTab {
  id: string;
  title: string;
}

export class GoogleService {
  /**
   * Helper to perform authorized fetch requests to Google APIs.
   */
  private static async authorizedFetch(url: string, accessToken: string, options: RequestInit = {}): Promise<any> {
    const cleanToken = accessToken.replace(/^Bearer\s+/i, '');
    const headers = {
      'Authorization': `Bearer ${cleanToken}`,
      'Accept': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });
      
      if (!response.ok) {
        const errText = await response.text();
        let errJSON;
        try {
          errJSON = JSON.parse(errText);
        } catch {
          // ignore
        }

        const status = response.status;
        const message = errJSON?.error?.message || response.statusText;

        if (status === 401) {
          throw new Error('Google OAuth token is expired or unauthorized. Please sign in again.');
        } else if (status === 403) {
          throw new Error('Access denied. You do not have permission to access this resource.');
        } else if (status === 404) {
          throw new Error('The requested Google resource (folder or document) could not be found.');
        } else {
          throw new Error(`Google API error (${status}): ${message}`);
        }
      }

      return await response.json();
    } catch (error: any) {
      if (error.message && (error.message.includes('fetch') || error.message.includes('network'))) {
        throw new Error('Network error. Unable to reach Google API services.');
      }
      throw error;
    }
  }

  /**
   * Validates if a Google Drive folder exists and is accessible.
   */
  public static async validateFolder(accessToken: string, folderId: string): Promise<{ id: string; name: string }> {
    const url = `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,mimeType`;
    const folder = await this.authorizedFetch(url, accessToken);

    if (folder.mimeType !== 'application/vnd.google-apps.folder') {
      throw new Error('The provided URL is not a valid Google Drive Folder.');
    }

    return {
      id: folder.id,
      name: folder.name,
    };
  }

  /**
   * Retrieves all Google Documents from a given Google Drive folder.
   */
  public static async getDocumentsInFolder(accessToken: string, folderId: string): Promise<GoogleDocFile[]> {
    const query = `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.document' and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime)&pageSize=100`;
    
    const data = await this.authorizedFetch(url, accessToken);
    return data.files || [];
  }

  /**
   * Reads metadata of a Google Document including its tabs structure.
   */
  public static async getDocumentTabs(accessToken: string, documentId: string): Promise<GoogleDocTab[]> {
    const url = `https://docs.googleapis.com/v1/documents/${documentId}?includeTabsContent=true`;
    const doc = await this.authorizedFetch(url, accessToken);

    const tabs: GoogleDocTab[] = [];
    
    function traverse(tabList: any[]) {
      for (const tab of tabList) {
        if (tab.tabProperties) {
          tabs.push({
            id: tab.tabProperties.tabId || tab.tabId,
            title: tab.tabProperties.title ? tab.tabProperties.title.trim() : '',
          });
        }
        if (tab.childTabs && tab.childTabs.length > 0) {
          traverse(tab.childTabs);
        }
      }
    }

    if (doc.tabs && doc.tabs.length > 0) {
      traverse(doc.tabs);
    }

    return tabs;
  }
}
