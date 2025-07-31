import { useState, useEffect } from 'react'
import { supabase, User } from '../lib/supabase'
import { useToast } from './use-toast'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await fetchUserProfile(session.user.id)
      }
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await fetchUserProfile(session.user.id)
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        return
      }

      setUser(data)
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const signUp = async (email: string, password: string, username?: string, fullName?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: fullName,
          }
        }
      })

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        })
        return { error }
      }

      if (data.user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            username,
            full_name: fullName,
          })

        if (profileError) {
          console.error('Error creating user profile:', profileError)
        }
      }

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      })

      return { data, error: null }
    } catch (error) {
      console.error('Sign up error:', error)
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive",
        })
        return { error }
      }

      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
      })

      return { data, error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      return { error }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        toast({
          title: "Sign out failed",
          description: error.message,
          variant: "destructive",
        })
        return { error }
      }

      setUser(null)
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      })

      return { error: null }
    } catch (error) {
      console.error('Sign out error:', error)
      return { error }
    }
  }

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return { error: new Error('No user logged in') }

    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        toast({
          title: "Profile update failed",
          description: error.message,
          variant: "destructive",
        })
        return { error }
      }

      setUser(data)
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      })

      return { data, error: null }
    } catch (error) {
      console.error('Profile update error:', error)
      return { error }
    }
  }

  return {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
  }
} 