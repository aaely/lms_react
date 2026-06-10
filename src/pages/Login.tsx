import { useState } from 'react'
import { Box, Button, FormControl, Input, InputLabel } from '@mui/material';
import { api } from '../utils/api';
import { user as u } from '../signals/signals';
import { useAtom } from 'jotai';
import axios from 'axios';

function Login() {

    const [form, setForm] = useState({
        username: '',
        password: ''
    })
    const [localView, setLocalView] = useState('login')
    const [user, setUser] = useAtom(u)
    const handleChange = ({target: { id, value}}: any) => {
        setForm({
            ...form,
            [id]: value
        })
    }
    const [error, setError] = useState('')
    const [isError, setIsError] = useState(false)
    const [showMessage, setShowMessage] = useState(false)
    const [accepted, setAccepted] = useState(false)

    const register = async () => {
        try {
            const params = {
                username: form.username,
                password: form.password
            }
            await api.post(`/register`, params)
            setLocalView('login')/*
            await trailerApi.register(form.username, form.password)
            setLocalView('login')*/
        } catch(error: unknown) {
            let message = 'Something went wrong during login'
            if (axios.isAxiosError(error)) {
                message = 
                    error.response?.data?.message || 
                    error.response?.data ||
                    error.message
            } else if (error instanceof Error) {
                message = error.message
            }

            setError(message)
            setIsError(true)
            console.log(error)
        }
    }

    const login = async () => {
        try {
            const params = {
                username: form.username,
                password: form.password
            }
            const res = await api.post(`/login`, params)
            setUser({
                email: res.data.user.username,
                role: res.data.user.role
            })
            console.log(user)
            /*
            const res = await trailerApi.login(form.username, form.password)
            setUser({
                email: res.user.email,
                id: res.user.id,
                accessToken: res.accessToken,
                refreshToken: res.refreshToken,
                role: res.user.role
            })*/
        } catch(error: unknown) {
            let message = 'Something went wrong during login'
            if (axios.isAxiosError(error)) {
                message = 
                    error.response?.data?.message || 
                    error.response?.data ||
                    error.message
            } else if (error instanceof Error) {
                message = error.message
            }

            setError(message)
            setIsError(true)
            console.log(error)
        }
    }

    const accept = () => {
        setShowMessage(prev => !prev)
        setAccepted(prev => !prev)
    }

    const message = () => {
        setShowMessage(prev => !prev)
    }

    const renderRegistration = () => {
        return(
            <Box className='container'>
                <h1>Register</h1>
                <FormControl sx={{ m: 1, width: '25ch' }} variant="standard">
                    <InputLabel htmlFor="door">Username</InputLabel>
                    <Input
                    id='username'
                    type='text'
                    value={form.username}
                    onChange={handleChange}
                    placeholder='149'
                    />
                </FormControl>
                <FormControl sx={{ m: 1, width: '25ch' }} variant="standard">
                    <InputLabel htmlFor="door">Password</InputLabel>
                    <Input
                    id='password'
                    type='password'
                    value={form.password}
                    onChange={handleChange}
                    placeholder='149'
                    />
                </FormControl>
                    {
                            showMessage ? privacyStatement() : <></>
                    }
                    <div style={{
                    display: 'flex',
                    width: '100%',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '5%'
                    }}>
                        {
                            showMessage && !accepted ?
                            <Button variant='contained' color='success' onClick={() => accept()}>I Accept</Button>
                            : !showMessage && accepted ?
                            <Button variant='contained' color='success' onClick={() => register()}>Register</Button>
                            :
                            <Button variant='contained' color='success' onClick={() => message()}>Privacy Agreement</Button>
                        }
                        <Button variant='contained' color='error' onClick={() => setLocalView('login')}>Back To Login</Button>
                    </div>
            </Box>
        )
    }

    const renderLogin = () => {
        return(
            <Box className='container'>
                <h1>Login</h1>
                <FormControl sx={{ m: 1, width: '25ch' }} variant="standard">
                    <InputLabel htmlFor="door">Username</InputLabel>
                    <Input
                    id='username'
                    type='text'
                    value={form.username}
                    onChange={handleChange}
                    placeholder='149'
                    />
                </FormControl>
                <FormControl sx={{ m: 1, width: '25ch' }} variant="standard">
                    <InputLabel htmlFor="door">Password</InputLabel>
                    <Input
                    id='password'
                    type='password'
                    value={form.password}
                    onChange={handleChange}
                    placeholder='149'
                    />
                </FormControl>
                <div style={{
                    display: 'flex',
                    width: '100%',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '5%'
                }}>
                    <Button variant='contained' color='success' onClick={() => login()}>Login</Button>
                    <Button variant='contained' color='error' onClick={() => setLocalView('register')}>Register</Button>
                </div>
                {
                    isError && <p style={{ color: 'red', marginTop: '5%' }}>{error}</p>
                }
            </Box>
        )
    }

    const privacyStatement = () => {
        return (
            <div style={{
                marginTop: '5%',
                padding: '2%',
                marginBottom: '5%',
            }}>
                <p><strong>Personal Information Collection Notice</strong></p>
                <br />
                <p>
                    When you register for MODMS, GM collects and processes the personal information you provide 
                    to create and manage your account, authenticate your access, provide and support the service, 
                    communicate with you about your account, maintain security, and meet legal, regulatory, 
                    and operational requirements.
                </p>
                <br />
                <p>
                    The personal information collected during registration may include your name, email address, 
                    username, password or other authentication credentials, company or organization name, job 
                    title or role, contact information, and any other information you choose to provide as part 
                    of the registration or profile setup process.
                </p>
                <br />
                <p>
                    We use this information only for legitimate business purposes related to operating and improving 
                    the service, administering user access, responding to support requests, protecting the security 
                    and integrity of the platform, and complying with applicable law, company policy, or contractual
                    obligations.
                </p>
                <br />
                <p>
                    Your personal information may be shared with affiliates, service providers, and other authorized 
                    parties that support the operation of the service or help us meet legal, security, audit, or 
                    compliance obligations. We may also disclose information where required by law or where necessary 
                    to protect our rights, users, systems, or business operations.
                </p>
                <br />
                <p>
                    We retain personal information only for as long as needed to fulfill the purposes described above, 
                    including account administration, legal, regulatory, audit, security, and recordkeeping requirements.
                </p>
                <br />
                <p>
                    We take reasonable and appropriate steps to protect personal information against unauthorized access, 
                    use, disclosure, alteration, or destruction. However, no system can be guaranteed to be completely secure.
                </p>
                <br />
                <p>
                    Depending on your location and applicable law, you may have rights regarding your personal information, 
                    such as the right to request access, correction, deletion, or additional information about how your 
                    information is processed.
                </p>
                <br />
                <p>
                    If you have questions about this notice or how your personal information is handled, please contact
                    aaron.ely@gm.com
                </p>
                <br />
                <p>
                    By selecting Register, Create Account, or continuing with registration, you acknowledge that you have 
                    read and understood this Personal Information Collection Notice.
                </p>
            </div>
        )
    }


    return(
        <div>
            {localView === 'register' ? renderRegistration() : renderLogin()}
        </div>
    )
}

export default Login