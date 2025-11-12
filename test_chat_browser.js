// Browser Console Test Script - Copy and paste into browser console
// Make sure you're logged in and on the Dashboard page

(async () => {
  const token = localStorage.getItem('token');
  const base = 'http://localhost:8000';
  
  if (!token) {
    console.error('❌ No token found! Please login first.');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  try {
    // 1. Get first project & provider
    console.log('📋 Getting project and provider...');
    const projects = await fetch(`${base}/api/projects`, {headers}).then(r => r.json());
    const providers = await fetch(`${base}/api/llm-providers/`, {headers}).then(r => r.json());
    
    if (!projects.length) {
      console.error('❌ No projects found! Create a project first.');
      return;
    }
    if (!providers.length) {
      console.error('❌ No LLM providers found! Add an LLM provider first.');
      return;
    }
    
    // 2. Create wrap
    console.log('🚀 Creating wrapped API...');
    const wrap = await fetch(`${base}/api/wrapped-apis/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Test Chat Wrap',
        project_id: projects[0].id,
        provider_id: providers[0].id
      })
    }).then(r => r.json());
    
    console.log('✅ Created:', wrap.name, '| ID:', wrap.id, '| Endpoint:', wrap.endpoint_id);
    
    // 3. Test config chat
    console.log('\n💬 Testing config chat...');
    const config = await fetch(`${base}/api/wrapped-apis/${wrap.id}/chat/config`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: 'Be a friendly Python coding assistant'
      })
    }).then(r => r.json());
    
    console.log('📝 Config Response:', config.response);
    
    // 4. Test chat
    console.log('\n🤖 Testing chat...');
    const chat = await fetch(`${base}/api/wrapped-apis/${wrap.endpoint_id}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: 'Hello! Can you help me with Python?'
      })
    }).then(r => r.json());
    
    const chatResponse = chat.choices?.[0]?.message?.content || 'No response';
    console.log('💭 Chat Response:', chatResponse);
    
    console.log('\n✅ Test complete! Check above for results.');
    console.log('🔗 Navigate to chat page:', `/chat/${wrap.id}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();

