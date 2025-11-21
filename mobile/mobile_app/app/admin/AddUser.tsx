import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator, TextInput, Alert, ScrollView } from 'react-native';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { buildPublicApiUrl, buildFullApiUrl } from '../../src/services/urlBuilder';
import { getCompanySlug, getAppSlug, getAccessToken } from '../../src/services/tokenStorage';

const validationSchema = yup.object({
  name: yup.string().required('Name is required'),
  email: yup.string().email('Enter a valid email').required('Email is required'),
  password: yup.string().min(8, 'Password min 8 chars').required('Password required'),
  company: yup.string().required('Company required'),
  role: yup.string().required('Role required'),
  team: yup.string().required('Team required'),
});

export default function AddUser(){
  const [companies, setCompanies] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ let mounted = true;
    (async ()=>{
      try{
        const cRes = await fetch(buildPublicApiUrl('/companies'));
        const cJson = await cRes.json();
        if(!mounted) return;
        setCompanies(cJson || []);

        const tRes = await fetch(buildPublicApiUrl('/teams'));
        const tJson = await tRes.json();
        if(!mounted) return;
        setTeams(tJson || []);

        const rRes = await fetch(buildPublicApiUrl('/roles'));
        const rJson = await rRes.json();
        if(!mounted) return;
        setRoles(rJson || []);
      }catch(e){
        console.error('Failed to load form lists', e);
      }
    })();
    return ()=>{ mounted = false };
  },[]);

  const formik = useFormik({
    initialValues: { name: '', email: '', password: '', company: '', role: '', team: '' },
    validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm })=>{
      setLoading(true);
      try{
        const companySlug = await getCompanySlug();
        const appSlug = await getAppSlug();
        const access = await getAccessToken();
        const url = buildFullApiUrl('/admin/add-user', companySlug || values.company, appSlug || undefined);
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(access ? { Authorization: `Bearer ${access}` } : {}) }, body: JSON.stringify(values) });
        const text = await res.text();
        const json = (()=>{ try{ return JSON.parse(text);}catch{ return text; } })();
        if(!res.ok) throw new Error((json && json.message) ? json.message : `Request failed ${res.status}`);
        Alert.alert('Success', 'User added successfully');
        resetForm();
      }catch(e:any){
        console.error('Add user failed', e);
        Alert.alert('Error', e.message || 'Failed to add user');
      }finally{ setLoading(false); setSubmitting(false); }
    }
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Add New User</Text>
      <View style={styles.field}>
        <Text>Name</Text>
        <TextInput style={styles.input} value={formik.values.name} onChangeText={t=>formik.setFieldValue('name', t)} placeholder="Full name" />
        {formik.touched.name && formik.errors.name && <Text style={styles.error}>{String(formik.errors.name)}</Text>}
      </View>

      <View style={styles.field}>
        <Text>Email</Text>
        <TextInput style={styles.input} value={formik.values.email} onChangeText={t=>formik.setFieldValue('email', t)} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />
        {formik.touched.email && formik.errors.email && <Text style={styles.error}>{String(formik.errors.email)}</Text>}
      </View>

      <View style={styles.field}>
        <Text>Password</Text>
        <TextInput style={styles.input} value={formik.values.password} onChangeText={t=>formik.setFieldValue('password', t)} placeholder="Password" secureTextEntry />
        {formik.touched.password && formik.errors.password && <Text style={styles.error}>{String(formik.errors.password)}</Text>}
      </View>

      <View style={styles.field}>
        <Text>Company</Text>
        <TextInput style={styles.input} value={formik.values.company} onChangeText={t=>formik.setFieldValue('company', t)} placeholder="Company slug (or choose below)" />
        {companies.length > 0 && companies.map(c=> (
          <Button key={c.id} title={c.name} onPress={()=>formik.setFieldValue('company', c.slug)} />
        ))}
        {formik.touched.company && formik.errors.company && <Text style={styles.error}>{String(formik.errors.company)}</Text>}
      </View>

      <View style={styles.field}>
        <Text>Role</Text>
        <TextInput style={styles.input} value={formik.values.role} onChangeText={t=>formik.setFieldValue('role', t)} placeholder="Role" />
        {roles.map(r=> <Button key={r.id} title={r.name} onPress={()=>formik.setFieldValue('role', r.name)} />)}
        {formik.touched.role && formik.errors.role && <Text style={styles.error}>{String(formik.errors.role)}</Text>}
      </View>

      <View style={styles.field}>
        <Text>Team</Text>
        <TextInput style={styles.input} value={formik.values.team} onChangeText={t=>formik.setFieldValue('team', t)} placeholder="Team" />
        {teams.map(t=> <Button key={t.id} title={t.name} onPress={()=>formik.setFieldValue('team', t.name)} />)}
        {formik.touched.team && formik.errors.team && <Text style={styles.error}>{String(formik.errors.team)}</Text>}
      </View>

      <View style={{ marginTop: 12, width: '100%' }}>
        {loading ? <ActivityIndicator/> : <Button title="Add User" onPress={()=>formik.handleSubmit()} />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  field: { marginBottom: 12 },
  input: { borderWidth:1, borderColor:'#ccc', padding:10, borderRadius:6, marginTop:6 },
  error: { color: 'red', marginTop: 6 }
});
