import React from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "./contexts/AuthContext";
import { useFormik } from "formik";
import * as yup from "yup";
import { login as loginService } from "../src/services/sessionService";
import { getSession as getSessionService } from "../src/services/sessionService";
import { getCompanySlug, getAppSlug } from "../src/services/tokenStorage";
import { useEffect, useState } from "react";

const validationSchema = yup.object({
  email: yup
    .string()
    .email("Enter a valid email")
    .required("Email is required"),
  password: yup.string().required("Password is required"),
});

export default function Login() {
  const router = useRouter();
  const auth = useAuth();
  const [qCompany, setQCompany] = useState<string | null>(null);
  const [qApp, setQApp] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const c = await getCompanySlug();
        const a = await getAppSlug();
        if (!mounted) return;
        setQCompany(c || null);
        setQApp(a || null);
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const formik = useFormik({
    initialValues: { email: "", password: "" },
    validationSchema,
    onSubmit: async (values, { setSubmitting, setErrors }) => {
      try {
        setSubmitting(true);
        console.debug("Login request", {
          email: values.email,
          company: qCompany,
          app: qApp,
        });
        // If AuthContext exposes a login method that accepts email/password, prefer it
        let userObj: any = null;
        if (auth && auth.login) {
          try {
            // auth.login(email, password, company?, app?) - pass both company and app
            await auth.login(
              values.email,
              values.password,
              qCompany || undefined,
              qApp || undefined
            );
            userObj = (auth as any).user;
            console.debug("AuthContext handled login, user:", userObj);
          } catch (e) {
            console.warn("AuthContext.login failed, falling back", e);
          }
        }

        // Fallback: if AuthContext not available or didn't populate user, call session service directly
        if (!userObj) {
          const loginResp = await loginService(
            { email: values.email, password: values.password },
            qCompany as string,
            qApp as string
          );
          console.debug("Login response (fallback)", loginResp);
          const s = await getSessionService();
          console.debug("Session after login (fallback)", s);
          userObj = s?.user ?? loginResp?.user;
        }

        // Only navigate to dashboard if login produced a user object or token
        const hasUser = !!userObj;
        const hasToken = !!(userObj && (userObj.token || userObj.accessToken));
        if (hasUser || hasToken) {
          try {
            await router.replace("/(tabs)/dashboard");
            return;
          } catch (e) {
            try {
              await router.replace("/");
              return;
            } catch (e2) {
              /* ignore */
            }
          }
        }
        // If we reach here, login did not succeed — surface an error
        setErrors({ email: "Invalid credentials or login failed" } as any);
      } catch (e: any) {
        setErrors({ email: e.message || "Login failed" } as any);
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Sign In {qCompany ? `— ${qCompany}/${qApp}` : ""}
      </Text>
      <View style={{ width: "100%" }}>
        <View style={styles.field}>
          <Text>Email</Text>
          <TextInput
            style={styles.input}
            value={formik.values.email}
            onChangeText={(text) => formik.setFieldValue("email", text)}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          {formik.touched.email && formik.errors.email && (
            <Text style={styles.errorText}>{String(formik.errors.email)}</Text>
          )}
        </View>
        <View style={styles.field}>
          <Text>Password</Text>
          <TextInput
            style={styles.input}
            value={formik.values.password}
            onChangeText={(text) => formik.setFieldValue("password", text)}
            secureTextEntry
            placeholder="Password"
          />
          {formik.touched.password && formik.errors.password && (
            <Text style={styles.errorText}>
              {String(formik.errors.password)}
            </Text>
          )}
        </View>
        {formik.isSubmitting ? (
          <ActivityIndicator style={{ marginTop: 12 }} />
        ) : (
          <View style={{ marginTop: 12 }}>
            <Button title="Sign in" onPress={() => formik.handleSubmit()} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 12 },
  field: { marginBottom: 12 },
  inputWrap: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 6,
    marginTop: 6,
  },
  inputText: { color: "#000" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 6,
    marginTop: 6,
  },
  errorText: { color: "red", marginTop: 4, fontSize: 12 },
});
