"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {Form,} from "@/components/ui/form"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"
import FormField from "./FormField"
import { useRouter } from "next/navigation"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { signIn, signUp } from "@/lib/actions/auth.action"
import { auth } from "@/firebase/client"

const AuthFormSchema = (type: FormType) => {
  return z.object({
    name: type === "sign-up" ? z.string().min(2).max(50) : z.string().optional(),
    email: z.string().email(),
    password: z.string().min(6),
  })
}

const AuthForm = ({type}:{type:FormType}) => {
  const router= useRouter();
  const formSchema = AuthFormSchema(type);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  })
 
  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if(type === "sign-up") {
        const {name, email, password} = values;
        const userCredential=await createUserWithEmailAndPassword(auth, email, password);
        const result = await signUp({
          uid: userCredential.user.uid,
          name: name!,
          email,
          password,
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        toast.success("Sign Up successful!");
        router.push('/sign-in'); 
      } else {
        const {email, password} = values;
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await userCredential.user.getIdToken();
        if (!idToken) {
          toast.error("Failed to get user token. Please try again.");
          return;
        }
        await signIn({idToken, email});
        toast.success("Sign In successful!");
        router.push('/');
      }
   } catch (error) {
      console.log(error);
      toast.error("Something went wrong, please try again later.")
    }
  }
  const isSignIn = type === "sign-in";
  return (
    <div className="card-border lg:min-w-[566px]">
      <div className="flex flex-col gap-6 card py-14 px-10">
        <div className="flex flex-row gap-2 justify-center">
          <Image src="/logo.svg" height={32} width={38} alt="Logo" />
          <h2 className="text-primary-100">PrepPulse</h2>
        </div>
        <h3 className="text-center text-sm text-muted-foreground">
          Practice interview with AI
        </h3>
       <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {!isSignIn && (<FormField control={form.control} name="name" label="Name" placeholder="Enter your name" />)}
        <FormField control={form.control} name="email" label="Email" placeholder="Enter your email" type="email" />
        <FormField control={form.control} name="password" label="Password" placeholder="Enter your password" type="password" />
        <Button className="" type="submit">{isSignIn?"Sign In":"Create an Account"}</Button>
        <p className="text-center">
          {isSignIn ? "Don't have an account?" : "Already have an account?"}{" "}
          <Link href={!isSignIn ? '/sign-in' : '/sign-up'} className="font-bold text-user-primary ml-1">
            {!isSignIn ? "Sign In" : "Sign Up"}
          </Link>
        </p>
      </form>
    </Form>
    </div>
    </div>
  )
}

export default AuthForm;